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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, clienteId } = body;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { error: "Suscripción inválida" },
        { status: 400 }
      );
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
          user_agent: req.headers.get("user-agent") || null,
          activa: true,
        },
        { onConflict: "endpoint" }
      )
      .select("id");

    if (error) {
      logger.error("push/subscribe", "Supabase error", error.code, error.message, error.details, error.hint);
      return NextResponse.json(
        { error: `Error al guardar suscripción: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: data?.[0]?.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "desconocido";
    logger.error("push/subscribe", "Error interno", message);
    return NextResponse.json(
      { error: `Error interno: ${message}` },
      { status: 500 }
    );
  }
}

// DELETE — desuscribirse
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
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
