/**
 * Estado abierto/cerrado del café para el label de la landing.
 * Horario asumido: 10:00–20:00, hora de Ciudad de México (UTC-6, sin DST).
 *
 * Extraído de page.tsx para testear las fronteras (apertura/cierre exactos).
 * COMPORTAMIENTO IDÉNTICO al inline original.
 *
 * ⚠️ LÍMITE CONOCIDO (pregunta para David, NO bug a arreglar a ciegas):
 * solo considera la HORA del día — NO el día de la semana ni feriados. Si
 * La Commune llegara a cerrar algún día (ej. lunes) o en festivos, el label
 * diría "Abierto" igual entre 10:00 y 20:00. Si el café abre los 7 días,
 * no hay problema. Ver RESUMEN → observaciones.
 */
export function getOpenStatus(now: Date = new Date()): { open: boolean; label: string } {
  const parts = new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0");
  const total = h * 60 + m;
  const open = total >= 600 && total < 1200; // 10:00 (600) – 20:00 (1200)
  return {
    open,
    label: open
      ? "Abierto · cierra a las 20:00"
      : total < 600
        ? "Cerrado · abre a las 10:00"
        : "Cerrado · abre mañana a las 10:00",
  };
}
