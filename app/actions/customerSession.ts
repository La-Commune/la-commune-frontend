"use server";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "customer-session";

function getHmacKey(): string {
  const key = process.env.ADMIN_HMAC_KEY;
  if (!key) throw new Error("ADMIN_HMAC_KEY not configured");
  return key;
}

function getFirestoreConfig() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId || !apiKey) throw new Error("Firebase config missing");
  return { projectId, apiKey };
}

// --- PIN hashing ---

export async function hashCustomerPin(pin: string): Promise<string> {
  return createHmac("sha256", getHmacKey())
    .update(`customer-pin:${pin}`)
    .digest("hex");
}

// --- Session cookie (signed) ---

export async function setCustomerSession(
  customerId: string,
  cardId: string,
): Promise<void> {
  const sig = createHmac("sha256", getHmacKey())
    .update(`session:${customerId}:${cardId}`)
    .digest("hex");

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${customerId}:${cardId}:${sig}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });
}

export async function getCustomerSession(): Promise<{
  customerId: string;
  cardId: string;
} | null> {
  const hmacKey = getHmacKey();
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) return null;

  const parts = value.split(":");
  if (parts.length !== 3) return null;

  const [customerId, cardId, sig] = parts;

  const expected = createHmac("sha256", hmacKey)
    .update(`session:${customerId}:${cardId}`)
    .digest("hex");

  try {
    if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex")))
      return null;
  } catch {
    return null;
  }

  return { customerId, cardId };
}

export async function clearCustomerSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// --- PIN verification + login ---

export type VerifyPinResult =
  | { ok: true; customerId: string; cardId: string }
  | { ok: false; error: string };

export async function verifyCustomerPin(
  phone: string,
  pin: string,
): Promise<VerifyPinResult> {
  const { projectId, apiKey } = getFirestoreConfig();
  const hmacKey = getHmacKey();

  // 1) Find customer by phone
  const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;

  const customerRes = await fetch(queryUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "customers" }],
        where: {
          compositeFilter: {
            op: "AND",
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: "phone" },
                  op: "EQUAL",
                  value: { stringValue: phone },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: "active" },
                  op: "EQUAL",
                  value: { booleanValue: true },
                },
              },
            ],
          },
        },
      },
    }),
  });

  const customerData = await customerRes.json();
  const customerDoc = customerData?.[0]?.document;

  if (!customerDoc) {
    return { ok: false, error: "No encontramos una cuenta con ese numero." };
  }

  const customerId = customerDoc.name.split("/").pop()!;
  const storedPinHmac = customerDoc.fields?.pinHmac?.stringValue;

  if (!storedPinHmac) {
    return {
      ok: false,
      error:
        "Esta cuenta no tiene PIN de recuperacion. Visitanos en barra para que te ayudemos.",
    };
  }

  // 2) Verify PIN
  const computed = createHmac("sha256", hmacKey)
    .update(`customer-pin:${pin}`)
    .digest("hex");

  try {
    if (
      !timingSafeEqual(
        Buffer.from(computed, "hex"),
        Buffer.from(storedPinHmac, "hex"),
      )
    ) {
      return { ok: false, error: "PIN incorrecto." };
    }
  } catch {
    return { ok: false, error: "PIN incorrecto." };
  }

  // 3) Find card (active or completed) for this customer
  const customerRefPath = `projects/${projectId}/databases/(default)/documents/customers/${customerId}`;

  const cardsRes = await fetch(queryUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "cards" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "customerId" },
            op: "EQUAL",
            value: { referenceValue: customerRefPath },
          },
        },
      },
    }),
  });

  const cardsData = await cardsRes.json();
  const cardDocs = (cardsData ?? [])
    .filter((r: any) => r.document)
    .map((r: any) => r.document);

  // Prefer active > completed > any
  const activeCard = cardDocs.find(
    (d: any) => d.fields?.status?.stringValue === "active",
  );
  const completedCard = cardDocs.find(
    (d: any) => d.fields?.status?.stringValue === "completed",
  );
  const bestCard = activeCard ?? completedCard;

  if (!bestCard) {
    return {
      ok: false,
      error:
        "Encontramos tu cuenta pero no tu tarjeta. Visitanos en barra para que te ayudemos.",
    };
  }

  const cardId = bestCard.name.split("/").pop()!;

  // 4) Set session cookie
  await setCustomerSession(customerId, cardId);

  return { ok: true, customerId, cardId };
}

// --- Update phone (server-verified) ---

export async function updateCustomerPhone(
  customerId: string,
  pin: string,
  newPhone: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { projectId, apiKey } = getFirestoreConfig();
  const hmacKey = getHmacKey();

  // Read customer doc
  const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/customers/${customerId}?key=${apiKey}`;
  const res = await fetch(docUrl, { cache: "no-store" });
  if (!res.ok) return { ok: false, error: "No se pudo leer tu cuenta." };

  const doc = await res.json();
  const storedPinHmac = doc.fields?.pinHmac?.stringValue;

  if (!storedPinHmac) {
    return { ok: false, error: "Tu cuenta no tiene PIN configurado." };
  }

  // Verify PIN
  const computed = createHmac("sha256", hmacKey)
    .update(`customer-pin:${pin}`)
    .digest("hex");

  try {
    if (
      !timingSafeEqual(
        Buffer.from(computed, "hex"),
        Buffer.from(storedPinHmac, "hex"),
      )
    ) {
      return { ok: false, error: "PIN incorrecto." };
    }
  } catch {
    return { ok: false, error: "PIN incorrecto." };
  }

  // Update phone via REST PATCH
  const patchUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/customers/${customerId}?key=${apiKey}&updateMask.fieldPaths=phone`;
  const patchRes = await fetch(patchUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: { phone: { stringValue: newPhone } },
    }),
  });

  if (!patchRes.ok) {
    return { ok: false, error: "No se pudo actualizar el telefono." };
  }

  return { ok: true };
}
