import { NextRequest, NextResponse } from "next/server";
import { checkBaristaSession } from "@/app/actions/verifyAdminPin";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const session = await checkBaristaSession();
  if (!session.valid) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { oldCardId: string; customerId: string; rewardRef: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!body.oldCardId || !body.customerId || !body.rewardRef) {
    return NextResponse.json(
      { error: "oldCardId, customerId y rewardRef son requeridos" },
      { status: 400 },
    );
  }

  const sb = getSupabaseServer();
  const { data, error } = await sb.rpc("canjear_tarjeta", {
    p_tarjeta_id: body.oldCardId,
    p_cliente_id: body.customerId,
    p_recompensa_id: body.rewardRef,
  });

  if (error) {
    logger.error("api/stamp/redeem", "RPC error", error);
    return NextResponse.json({ error: "Error al canjear tarjeta" }, { status: 500 });
  }

  return NextResponse.json({ newCardId: data });
}
