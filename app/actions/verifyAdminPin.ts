"use server";

export async function verifyAdminPin(pin: string): Promise<boolean> {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) throw new Error("ADMIN_PIN no está configurado en las variables de entorno");
  return pin === adminPin;
}
