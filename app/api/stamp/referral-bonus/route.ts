import { NextRequest, NextResponse } from "next/server";
import { checkBaristaSession } from "@/app/actions/verifyAdminPin";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

const NEGOCIO_ID = process.env.NEXT_PUBLIC_NEGOCIO_ID!;

export async function POST(req: NextRequest) {
  const session = await checkBaristaSession();
  if (!session.valid) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { referredCustomerId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!body.referredCustomerId) {
    return NextResponse.json({ error: "referredCustomerId requerido" }, { status: 400 });
  }

  const sb = getSupabaseServer();

  // Get customer data
  const { data: customer, error: customerError } = await sb
    .from("clientes")
    .select("id_referidor, bono_referido_entregado")
    .eq("id", body.referredCustomerId)
    .eq("negocio_id", NEGOCIO_ID)
    .single();

  if (customerError || !customer) return NextResponse.json({ ok: true, skipped: "no-customer" });
  if (!customer.id_referidor || customer.bono_referido_entregado) {
    return NextResponse.json({ ok: true, skipped: "already-awarded-or-no-referrer" });
  }

  // Get referrer's active card
  const { data: referrerCard, error: cardError } = await sb
    .from("tarjetas")
    .select("id, sellos, sellos_maximos, estado")
    .eq("negocio_id", NEGOCIO_ID)
    .eq("cliente_id", customer.id_referidor)
    .eq("estado", "activa")
    .limit(1)
    .single();

  if (cardError || !referrerCard) return NextResponse.json({ ok: true, skipped: "no-active-card" });
  if (referrerCard.sellos >= referrerCard.sellos_maximos) {
    return NextResponse.json({ ok: true, skipped: "card-full" });
  }

  // Award bonus via RPC with service_role
  const { error: bonusError } = await sb.rpc("agregar_sello_a_tarjeta", {
    p_tarjeta_id: referrerCard.id,
    p_cliente_id: customer.id_referidor,
    p_agregado_por: "system",
    p_tipo_bebida: null,
    p_tamano: null,
    p_notas: "Bono por referido",
  });

  if (bonusError) {
    logger.error("api/stamp/referral-bonus", "RPC error", bonusError);
    return NextResponse.json({ error: "Error al otorgar bono" }, { status: 500 });
  }

  // Mark bonus as delivered
  const { error: updateError } = await sb
    .from("clientes")
    .update({ bono_referido_entregado: true })
    .eq("id", body.referredCustomerId)
    .eq("negocio_id", NEGOCIO_ID);

  if (updateError) {
    logger.error("api/stamp/referral-bonus", "Error marking bonus delivered", updateError);
  }

  return NextResponse.json({ ok: true });
}
