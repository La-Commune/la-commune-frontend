"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
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
      rewardRef,
      maxStamps: 10,
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
    <div className="grow flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-10 text-center">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-2xl font-medium tracking-wide text-stone-800">
            Guarda tu tarjeta ☕
          </h1>

          <p className="text-sm leading-relaxed text-stone-500">
            Así no pierdes tus sellos y cada visita suma para tu próximo café.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <Input
            placeholder="Tu nombre (opcional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-center"
          />

          <div className="space-y-1">
            <Input
              required
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Tu número de WhatsApp"
              value={phone}
              onChange={handlePhoneChange}
              className="text-center tracking-widest"
            />

            <p className="text-[11px] text-stone-400 text-right">
              {phone.length}/10
            </p>
          </div>

          <label className="flex items-start gap-3 text-xs text-stone-500 leading-snug">
            <input
              type="checkbox"
              checked={consentWhatsApp}
              onChange={(e) => setConsentWhatsApp(e.target.checked)}
              className="mt-0.5"
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
            className="
              w-full
              rounded-full
              bg-[#2B2B2B]
              py-6
              text-sm
              tracking-wide
              transition
              hover:bg-black
              disabled:opacity-40
            "
            onClick={handleSubmit}
            disabled={!isValidPhone}
          >
            Crear mi tarjeta
          </Button>

          <p className="text-[11px] text-stone-400 tracking-wide">
            Sin contraseñas · Sin spam
          </p>
        </div>
      </div>
    </div>
  );
}
