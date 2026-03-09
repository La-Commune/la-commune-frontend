"use server";

import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import { headers, cookies } from "next/headers";
import { getSupabaseServer } from "@/lib/supabase-server";

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const COOKIE_MAX_AGE = 7200; // 2 hours

// Secret for signing session cookies — falls back to a random key per process
const COOKIE_SECRET =
  process.env.ADMIN_HMAC_KEY ??
  process.env.COOKIE_SECRET ??
  randomBytes(32).toString("hex");

const attemptMap = new Map<string, { count: number; resetAt: number }>();

// ── Types ──────────────────────────────────────────────

export type VerifyResult =
  | { ok: true; nombre: string; rol: string }
  | { ok: false; blocked?: false }
  | { ok: false; blocked: true; retryAfter: number };

export type SessionResult =
  | { valid: true; nombre: string; rol: string }
  | { valid: false };

// ── Helpers ────────────────────────────────────────────

function signSessionPayload(payload: {
  userId: string;
  nombre: string;
  rol: string;
  exp: number;
}): string {
  const json = JSON.stringify(payload);
  const data = Buffer.from(json).toString("base64url");
  const sig = createHmac("sha256", COOKIE_SECRET)
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

function verifySessionToken(
  token: string,
): { userId: string; nombre: string; rol: string; exp: number } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [data, sig] = parts;
  const expectedSig = createHmac("sha256", COOKIE_SECRET)
    .update(data)
    .digest("base64url");

  // Timing-safe comparison of signatures
  try {
    const sigBuf = Buffer.from(sig, "base64url");
    const expectedBuf = Buffer.from(expectedSig, "base64url");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  try {
    const json = Buffer.from(data, "base64url").toString("utf-8");
    const payload = JSON.parse(json);

    // Check expiration
    if (!payload.exp || Date.now() > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

async function getClientIP(): Promise<string> {
  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : "unknown";
}

// ── Main: Verify PIN via usuarios table ────────────────

export async function verifyAdminPin(pin: string): Promise<VerifyResult> {
  const ip = await getClientIP();
  const now = Date.now();
  const entry = attemptMap.get(ip);

  // Check if currently blocked
  if (entry && entry.count >= MAX_ATTEMPTS && now < entry.resetAt) {
    return {
      ok: false,
      blocked: true,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  // Reset expired window
  if (entry && now >= entry.resetAt) {
    attemptMap.delete(ip);
  }

  // Call the same RPC the POS uses — runs with service_role (bypasses RLS)
  const sb = getSupabaseServer();
  const { data, error } = await sb.rpc("login_por_pin", {
    pin_input: pin,
  });

  console.log("[verifyAdminPin] RPC result:", JSON.stringify(data));
  if (error) {
    console.error("[verifyAdminPin] RPC error:", error.message);
  }

  const result = data as {
    success: boolean;
    id?: string;
    nombre?: string;
    rol?: string;
    error?: string;
  } | null;

  if (!result?.success || !result.id || !result.nombre || !result.rol) {
    // PIN incorrecto — registrar intento
    const existing = attemptMap.get(ip);
    if (existing) {
      existing.count += 1;
    } else {
      attemptMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    }
    return { ok: false };
  }

  // PIN correcto — resetear intentos y emitir cookie con rol
  attemptMap.delete(ip);

  const token = signSessionPayload({
    userId: result.id,
    nombre: result.nombre,
    rol: result.rol,
    exp: now + COOKIE_MAX_AGE * 1000,
  });

  const cookieStore = await cookies();
  cookieStore.set("barista-session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
    path: "/admin",
  });

  return { ok: true, nombre: result.nombre, rol: result.rol };
}

// ── Check existing session ─────────────────────────────

export async function checkBaristaSession(): Promise<SessionResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get("barista-session")?.value ?? "";

  if (!token) return { valid: false };

  const payload = verifySessionToken(token);
  if (!payload) return { valid: false };

  return { valid: true, nombre: payload.nombre, rol: payload.rol };
}

// ── Logout ─────────────────────────────────────────────

export async function logoutBarista(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("barista-session");
}
