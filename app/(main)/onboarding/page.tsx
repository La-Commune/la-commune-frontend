"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirestore } from "reactfire";
import { createCustomer, getCustomerByPhone } from "@/services/customer.service";
import { doc, getDoc, DocumentReference } from "firebase/firestore";
import { createCard, getCardByCustomer } from "@/services/card.service";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { hashCustomerPin, setCustomerSession } from "@/app/actions/customerSession";

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingForm />
    </Suspense>
  );
}

function OnboardingForm() {
  const params = useSearchParams();
  const router = useRouter();
  const cardId = params!.get("cardId");
  const firestore = useFirestore();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [consentWhatsApp, setConsentWhatsApp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const isValidPhone = phone.length === 10;
  const isValidPin = pin.length === 4;
  const phoneError = phoneTouched && phone.length > 0 && phone.length < 10
    ? "Ingresa los 10 digitos"
    : null;

  const handleSubmit = async () => {
    if (!phone || !isValidPin) return;
    setLoading(true);
    setError(null);

    try {
      // Check if phone already registered — don't auto-login, require recovery with PIN
      const existing = await getCustomerByPhone(firestore, phone);

      if (existing) {
        setError("Ya existe una cuenta con este numero. Usa \"Recuperar mi tarjeta\" para acceder.");
        setLoading(false);
        return;
      }

      let referrerCustomerId: string | undefined;
      if (cardId) {
        try {
          const referrerCardSnap = await getDoc(doc(firestore, "cards", cardId));
          if (referrerCardSnap.exists()) {
            const ref = referrerCardSnap.data().customerId as DocumentReference | undefined;
            referrerCustomerId = ref?.id;
          }
        } catch {
          // No bloquear el registro si el lookup falla
        }
      }

      // Hash PIN server-side before storing
      const pinHmac = await hashCustomerPin(pin);

      const customerRef = await createCustomer(firestore, {
        name,
        phone,
        consentWhatsApp,
        pinHmac,
        ...(referrerCustomerId ? { referrerCustomerId } : {}),
      });

      const rewardRef = doc(firestore, "rewards", "default");

      const cardRef = await createCard(firestore, {
        customerRef,
        rewardRef,
      });

      // Set both localStorage and httpOnly cookie
      localStorage.setItem("customerId", customerRef.id);
      localStorage.setItem("cardId", cardRef.id);
      await setCustomerSession(customerRef.id, cardRef.id);

      router.replace("/card/" + cardRef.id);
    } catch (e: any) {
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      if (offline) {
        setError("Sin conexion a internet. Verifica tu red e intenta de nuevo.");
      } else if (e?.code === "permission-denied") {
        setError("No se pudo acceder al servicio. Intenta mas tarde.");
      } else {
        setError("Algo salio mal. Intenta de nuevo o visitanos en barra.");
      }
      setLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const onlyNumbers = e.target.value.replace(/\D/g, "");
    setPhone(onlyNumbers.slice(0, 10));
  };

  return (
    <div id="main-content" className="min-h-screen bg-stone-50 text-stone-900 dark:bg-neutral-950 dark:text-white flex flex-col">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.3em] text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors duration-300 group"
        >
          <span className="w-4 h-px bg-stone-400 dark:bg-stone-500 group-hover:w-7 group-hover:bg-stone-900 dark:group-hover:bg-white transition-all duration-500" />
          Inicio
        </Link>
        <span className="text-[10px] uppercase tracking-[0.45em] text-stone-400 dark:text-stone-500">
          La Commune
        </span>
        <ThemeToggle />
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
            <p className="text-[10px] uppercase tracking-[0.4em] text-stone-400 dark:text-stone-600">
              Programa de fidelidad
            </p>
            <h1 className="font-display text-4xl font-light tracking-wide">
              Tu tarjeta, siempre contigo
            </h1>
            <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              Crea tu tarjeta de fidelidad. Solo necesitas tu WhatsApp y un PIN
              de 4 digitos para recuperarla despues.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-[10px] uppercase tracking-[0.3em] text-stone-400 dark:text-stone-600 text-left">
                Nombre <span className="text-stone-300 dark:text-stone-700">(opcional)</span>
              </label>
              <Input
                id="name"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-base text-center bg-white dark:bg-neutral-900 border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:border-stone-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="phone" className="block text-[10px] uppercase tracking-[0.3em] text-stone-400 dark:text-stone-600 text-left">
                WhatsApp <span className="text-red-500/70">*</span>
              </label>
              <Input
                id="phone"
                required
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="10 digitos"
                maxLength={10}
                value={phone}
                onChange={handlePhoneChange}
                onBlur={() => setPhoneTouched(true)}
                className={`text-base text-center tracking-widest bg-white dark:bg-neutral-900 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:border-stone-500 ${
                  phoneError ? "border-red-400 dark:border-red-500" : "border-stone-300 dark:border-stone-700"
                }`}
              />
              <div className="flex justify-between">
                {phoneError ? (
                  <p className="text-[11px] text-red-500 dark:text-red-400">{phoneError}</p>
                ) : (
                  <span />
                )}
                <p className={`text-[11px] ${isValidPhone ? "text-emerald-500" : "text-stone-400 dark:text-stone-600"}`}>
                  {phone.length}/10{isValidPhone && " ✓"}
                </p>
              </div>
            </div>

            {/* PIN */}
            <div className="space-y-1.5">
              <label htmlFor="pin" className="block text-[10px] uppercase tracking-[0.3em] text-stone-400 dark:text-stone-600 text-left">
                PIN de recuperacion <span className="text-red-500/70">*</span>
              </label>
              <Input
                id="pin"
                required
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="4 digitos"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="text-base text-center tracking-[0.5em] bg-white dark:bg-neutral-900 border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:border-stone-500"
              />
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-stone-400 dark:text-stone-600 text-left">
                  Lo necesitaras si cambias de dispositivo.
                </p>
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                        i < pin.length
                          ? "bg-stone-800 dark:bg-stone-200"
                          : "bg-stone-300 dark:bg-stone-700"
                      }`}
                    />
                  ))}
                </div>
              </div>
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
                promociones del cafe.
              </span>
            </label>
          </div>

          {/* Error */}
          {error && (
            <p className="text-[11px] text-red-500 dark:text-red-400 tracking-wide">{error}</p>
          )}

          {/* CTA */}
          <div className="space-y-4">
            <Button
              className="w-full rounded-full bg-stone-800 text-white dark:bg-white dark:text-neutral-900 py-6 text-sm tracking-wide transition hover:bg-stone-900 dark:hover:bg-stone-100 disabled:opacity-30"
              onClick={handleSubmit}
              disabled={!isValidPhone || !isValidPin || loading}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Un momento...
                </span>
              ) : "Continuar"}
            </Button>
            <p className="text-[11px] text-stone-400 dark:text-stone-600 tracking-wide">
              <Link
                href="/recover"
                className="underline underline-offset-2 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
              >
                Ya tengo cuenta, recuperar mi tarjeta
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
