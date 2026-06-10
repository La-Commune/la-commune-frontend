import { NextRequest, NextResponse } from "next/server";
import { checkBaristaSession } from "@/app/actions/verifyAdminPin";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const session = await checkBaristaSession();
  if (!session.valid) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { cardId: string; eventId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!body.cardId || !body.eventId) {
    return NextResponse.json({ error: "cardId y eventId requeridos" }, { status: 400 });
  }

  const sb = getSupabaseServer();
  const { error } = await sb.rpc("deshacer_sello", {
    p_tarjeta_id: body.cardId,
    p_evento_id: body.eventId,
  });

  if (error) {
    logger.error("api/stamp/undo", "RPC error", error);
    return NextResponse.json({ error: "Error al deshacer sello" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
