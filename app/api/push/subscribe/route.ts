import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Usamos service role para INSERT en push_subscriptions
// (el frontend llama esta ruta con anon key, pero la ruta usa service role internamente)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Upsert: si el endpoint ya existe, actualiza las keys y reactiva
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          cliente_id: clienteId || null,
          user_agent: req.headers.get("user-agent") || null,
          activa: true,
        },
        { onConflict: "endpoint" }
      );

    if (error) {
      console.error("[push/subscribe] Error:", error.message);
      return NextResponse.json(
        { error: "Error al guardar suscripción" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/subscribe] Error:", err);
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

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint requerido" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .update({ activa: false })
      .eq("endpoint", endpoint);

    if (error) {
      console.error("[push/unsubscribe] Error:", error.message);
      return NextResponse.json(
        { error: "Error al desactivar suscripción" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/unsubscribe] Error:", err);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
