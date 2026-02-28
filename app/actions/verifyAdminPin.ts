"use server";

import { timingSafeEqual } from "crypto";

export async function verifyAdminPin(pin: string): Promise<boolean> {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) throw new Error("ADMIN_PIN no está configurado en las variables de entorno");
  // timingSafeEqual previene timing attacks — ambos buffers deben tener el mismo largo
  const a = Buffer.alloc(64);
  const b = Buffer.alloc(64);
  a.write(pin);
  b.write(adminPin);
  return timingSafeEqual(a, b) && pin === adminPin;
}
