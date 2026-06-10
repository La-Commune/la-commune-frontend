/**
 * Decide si una promoción aplica a un item del menú (para mostrar su badge).
 * Extraído del JSX inline de menu/page.tsx para testear el comportamiento.
 * LÓGICA IDÉNTICA a la original.
 *
 * Regla: si `appliesTo` está vacío → aplica a TODO. Si no, hace match
 * case-insensitive cuando `appliesTo` CONTIENE el nombre del item o de la
 * sección.
 *
 * ⚠️ QUIRK DIRECCIONAL (pregunta para David, NO "arreglar" a ciegas — cambia
 * qué productos muestran badge): el match es `appliesTo.includes(nombre)`, no
 * al revés. O sea, un `appliesTo` AMPLIO falla con nombres específicos más
 * largos: una promo con `appliesTo="Café"` NO badgea el item "Café Americano"
 * (`"café".includes("café americano")` es false). Solo matchea cuando el
 * nombre del item/sección está CONTENIDO en appliesTo (ej. `appliesTo="Lattes,
 * Espresso"` sí badgea el item "Latte", porque "latte" ⊂ "lattes, espresso").
 * Si la intención es "el item pertenece a la categoría appliesTo", la dirección
 * está invertida. Ver RESUMEN → observaciones.
 */
export function promoApplies(
  appliesTo: string | undefined | null,
  itemName: string,
  sectionTitle: string,
): boolean {
  if (!appliesTo) return true;
  const a = appliesTo.toLowerCase();
  return a.includes(itemName.toLowerCase()) || a.includes(sectionTitle.toLowerCase());
}
