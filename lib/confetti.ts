import confetti from "canvas-confetti";

/** Lanzar confetti dorado al completar tarjeta o desbloquear logro */
export function fireCelebration() {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const defaults = {
    spread: 70,
    ticks: 100,
    gravity: 0.9,
    decay: 0.92,
    startVelocity: 30,
    colors: ["#C49A3C", "#D4AF37", "#F5DEB3", "#8B6914", "#FFFFFF"],
  };

  confetti({
    ...defaults,
    particleCount: 40,
    scalar: 1.2,
    shapes: ["circle", "square"],
    origin: { x: 0.3, y: 0.6 },
  });

  confetti({
    ...defaults,
    particleCount: 40,
    scalar: 1.2,
    shapes: ["circle", "square"],
    origin: { x: 0.7, y: 0.6 },
  });
}

/** Mini confetti sutil para logros individuales */
export function fireAchievement() {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  confetti({
    particleCount: 25,
    spread: 55,
    ticks: 60,
    gravity: 1.2,
    startVelocity: 20,
    colors: ["#C49A3C", "#D4AF37", "#F5DEB3"],
    shapes: ["circle"],
    origin: { x: 0.5, y: 0.5 },
    scalar: 0.8,
  });
}
