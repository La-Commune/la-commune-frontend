/**
 * Helpers de formato del perfil del cliente. Extraídos de profile/page.tsx
 * para testear las fronteras. COMPORTAMIENTO IDÉNTICO al inline original.
 */

/** Enmascara el teléfono dejando solo los últimos 4 dígitos. */
export function maskPhone(phone: string): string {
  if (phone.length < 4) return phone;
  return `****${phone.slice(-4)}`;
}

/** Nivel del cliente según total de visitas (badge Nuevo/Regular/Frecuente/VIP). */
export function getTierLevel(visits: number): { name: string; color: string } {
  if (visits < 5) return { name: "Nuevo", color: "blue" };
  if (visits < 15) return { name: "Regular", color: "amber" };
  if (visits < 30) return { name: "Frecuente", color: "emerald" };
  return { name: "VIP", color: "purple" };
}

/**
 * Formatea una fecha como "mes año" en español (ej. "junio 2026").
 * Usada en "Cliente desde …". Distinta de lib/utils.formatDate ("día mes").
 */
export function formatMonthYear(date: Date | string | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}
