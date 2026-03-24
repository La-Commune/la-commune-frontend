/**
 * Haptic feedback utilities — usa la Vibration API del navegador.
 * En dispositivos que no soportan vibración (desktop, iOS Safari), no hace nada.
 */

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

/** Toque ligero — tap en botón, selección */
export function hapticLight() {
  vibrate(10);
}

/** Toque medio — acción completada (sello agregado, guardar) */
export function hapticMedium() {
  vibrate(25);
}

/** Éxito — canjear tarjeta, logro desbloqueado */
export function hapticSuccess() {
  vibrate([30, 50, 30]);
}

/** Celebración — tarjeta completada, primer logro */
export function hapticCelebration() {
  vibrate([40, 30, 40, 30, 60]);
}

/** Error — acción fallida */
export function hapticError() {
  vibrate([50, 30, 50]);
}
