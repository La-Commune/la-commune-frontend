import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// Lazy init — evita que Next.js ejecute createClient en build time
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      `Supabase config incompleta: URL=${url ? "ok" : "FALTA"}, SERVICE_KEY=${key ? "ok" : "FALTA"}`
    );
  }

  return createClient(url, key);
}

// — Validación de input (la ruta es pública: sin esto se puede inundar la tabla) —
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length > 1024) return false;
  try {
    return new URL(endpoint).protocol === "https:";
  } catch {
    return false;
  }
}

function isValidKey(key: unknown, maxLen: number): key is string {
  return typeof key === "string" && key.length > 0 && key.length <= maxLen && /^[A-Za-z0-9_\-=+/]+$/.test(key);
}

// Rate limiting por IP — la ruta es pública y escribe con service role
const RL_MAX = 10;
const RL_WINDOW_MS = 10 * 60 * 1000;
const rlMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rlMap.get(ip);
  if (entry && now >= entry.resetAt) rlMap.delete(ip);
  const current = rlMap.get(ip);
  if (current && current.count >= RL_MAX) return true;
  if (current) {
    current.count += 1;
  } else {
    rlMap.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS });
  }
  return false;
}

function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "0.0.0.0"
  );
}

export async function POST(req: NextRequest) {
  try {
    if (isRateLimited(getIP(req))) {
      return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
    }

    const body = await req.json();
    const { subscription, clienteId } = body;

    if (
      !isValidPushEndpoint(subscription?.endpoint) ||
      !isValidKey(subscription?.keys?.p256dh, 256) ||
      !isValidKey(subscription?.keys?.auth, 256)
    ) {
      return NextResponse.json(
        { error: "Suscripción inválida" },
        { status: 400 }
      );
    }

    if (clienteId && !UUID_RE.test(String(clienteId))) {
      return NextResponse.json({ error: "Cliente inválido" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Upsert: si el endpoint ya existe, actualiza las keys y reactiva
    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth_key: subscription.keys.auth,
          cliente_id: clienteId || null,
          user_agent: req.headers.get("user-agent")?.slice(0, 512) || null,
          activa: true,
        },
        { onConflict: "endpoint" }
      )
      .select("id");

    if (error) {
      // Detalle solo en logs server-side — al cliente, mensaje genérico
      logger.error("push/subscribe", "Supabase error", error.code, error.message, error.details, error.hint);
      return NextResponse.json(
        { error: "Error al guardar suscripción" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: data?.[0]?.id });
  } catch (err) {
    logger.error("push/subscribe", "Error interno", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}

// DELETE — desuscribirse
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint } = body;

    if (!isValidPushEndpoint(endpoint)) {
      return NextResponse.json(
        { error: "Endpoint requerido" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from("push_subscriptions")
      .update({ activa: false })
      .eq("endpoint", endpoint);

    if (error) {
      logger.error("push/unsubscribe", "Error al desactivar", error.message);
      return NextResponse.json(
        { error: "Error al desactivar suscripción" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("push/unsubscribe", "Error interno", err);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
