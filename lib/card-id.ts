/**
 * Extrae el cardId (UUID) de lo que escanea/teclea el barista en el admin.
 *
 * El QR de la tarjeta codifica una URL completa (`.../card/<uuid>?...#...`),
 * pero el barista también puede pegar un UUID pelón. Esta función normaliza
 * ambos casos a solo el UUID:
 *  - URL completa  → quita todo hasta `/card/`, luego query y hash
 *  - UUID pelón    → trim (sin `/card/`, el replace no hace nada)
 *
 * Es parsing puro (sin red): si devuelve un id basura, el caller hace la
 * query y simplemente no encuentra la tarjeta. Mantener el comportamiento
 * EXACTO del original inline — es la frontera entre el escáner y el sellado.
 */
export function resolveCardId(raw: string): string {
  return raw
    .trim()
    .replace(/^.*\/card\//, "")
    .split("?")[0]
    .split("#")[0];
}
