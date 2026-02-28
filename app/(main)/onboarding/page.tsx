"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirestore } from "reactfire";
import { createCustomer } from "@/services/customer.service";
import { doc } from "firebase/firestore";
import { createCard } from "@/services/card.service";

export default function OnboardingPage() {
  const params = useSearchParams();
  const router = useRouter();
  const cardId = params!.get("cardId");
  const firestore = useFirestore();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consentWhatsApp, setConsentWhatsApp] = useState(false);

  const isValidPhone = phone.length === 10;

  const handleSubmit = async () => {
    if (!phone) return;

    const customerRef = await createCustomer(firestore, {
      name,
      phone,
      consentWhatsApp,
    });    

    const rewardRef = doc(firestore, "rewards", "default");

    const cardRef = await createCard(firestore, {
      customerRef,
      rewardRef
    });

    localStorage.setItem("customerId", customerRef.id);
    localStorage.setItem("cardId", cardRef.id);

    router.replace("/card/" + cardRef.id);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const onlyNumbers = e.target.value.replace(/\D/g, "");
    setPhone(onlyNumbers.slice(0, 10));
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.3em] text-stone-400 hover:text-white transition-colors duration-300 group"
        >
          <span className="w-4 h-px bg-stone-500 group-hover:w-7 group-hover:bg-white transition-all duration-500" />
          Inicio
        </Link>
        <span className="text-[10px] uppercase tracking-[0.45em] text-stone-500">
          La Commune
        </span>
        <div className="w-16" />
      </nav>

      {/* Contenido */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-sm space-y-10 text-center"
        >
          {/* Header */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.4em] text-stone-600">
              Programa de fidelidad
            </p>
            <h1 className="font-display text-4xl font-light tracking-wide">
              Guarda tu tarjeta
            </h1>
            <p className="text-sm leading-relaxed text-stone-400">
              Así no pierdes tus sellos y cada visita suma para tu próximo café.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-[10px] uppercase tracking-[0.3em] text-stone-600 text-left">
                Nombre <span className="text-stone-700">(opcional)</span>
              </label>
              <Input
                id="name"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-center bg-neutral-900 border-stone-700 text-white placeholder:text-stone-600 focus:border-stone-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="phone" className="block text-[10px] uppercase tracking-[0.3em] text-stone-600 text-left">
                WhatsApp <span className="text-red-500/70">*</span>
              </label>
              <Input
                id="phone"
                required
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="10 dígitos"
                value={phone}
                onChange={handlePhoneChange}
                className="text-center tracking-widest bg-neutral-900 border-stone-700 text-white placeholder:text-stone-600 focus:border-stone-500"
              />
              <p className="text-[11px] text-stone-600 text-right">
                {phone.length}/10
              </p>
            </div>

            <label className="flex items-start gap-3 text-xs text-stone-500 leading-snug text-left">
              <input
                type="checkbox"
                checked={consentWhatsApp}
                onChange={(e) => setConsentWhatsApp(e.target.checked)}
                className="mt-0.5 accent-stone-400"
              />
              <span>
                Acepto recibir mensajes por WhatsApp relacionados con mi tarjeta y
                promociones del café.
              </span>
            </label>
          </div>

          {/* CTA */}
          <div className="space-y-4">
            <Button
              className="w-full rounded-full bg-white text-neutral-900 py-6 text-sm tracking-wide transition hover:bg-stone-100 disabled:opacity-30"
              onClick={handleSubmit}
              disabled={!isValidPhone}
            >
              Crear mi tarjeta
            </Button>
            <p className="text-[11px] text-stone-600 tracking-wide">
              Sin contraseñas · Sin spam
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
