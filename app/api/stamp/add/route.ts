import { NextRequest, NextResponse } from "next/server";
import { checkBaristaSession } from "@/app/actions/verifyAdminPin";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  // Auth gate — cookie must reach this route (path "/" fixed in verifyAdminPin)
  const session = await checkBaristaSession();
  if (!session.valid) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: {
    cardId: string;
    customerId?: string;
    addedBy?: string;
    drinkType?: string;
    size?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!body.cardId) {
    return NextResponse.json({ error: "cardId requerido" }, { status: 400 });
  }

  const sb = getSupabaseServer();
  const { data, error } = await sb.rpc("agregar_sello_a_tarjeta", {
    p_tarjeta_id: body.cardId,
    p_cliente_id: body.customerId ?? null,
    p_agregado_por: body.addedBy ?? session.nombre,
    p_tipo_bebida: body.drinkType ?? null,
    p_tamano: body.size ?? null,
    p_notas: null,
  });

  if (error) {
    logger.error("api/stamp/add", "RPC error", error);
    return NextResponse.json({ error: "Error al agregar sello" }, { status: 500 });
  }

  return NextResponse.json({
    stamps: data.sellos,
    maxStamps: data.sellos_maximos,
    status: data.estado,
    eventId: data.evento_id,
  });
}
