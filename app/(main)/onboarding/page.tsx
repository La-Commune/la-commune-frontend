"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useRef, Suspense } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCustomer, getCustomerByPhone } from "@/services/customer.service";
import { createCard, getCardByCustomer } from "@/services/card.service";
import { hapticCelebration, hapticError } from "@/lib/haptics";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { hashCustomerPin, setCustomerSession } from "@/app/actions/customerSession";
import { getSupabase, NEGOCIO_ID } from "@/lib/supabase";

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingForm />
    </Suspense>
  );
}

const shakeAnimation = {
  x: [0, -8, 8, -6, 6, -3, 3, 0],
  transition: { duration: 0.4 },
};

function OnboardingForm() {
  const params = useSearchParams();
  const router = useRouter();
  const cardId = params!.get("cardId");
  const refCustomerId = params!.get("ref"); // referido directo por customer ID

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [consentWhatsApp, setConsentWhatsApp] = useState(false);
  const [consentEmail, setConsentEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [shakePhone, setShakePhone] = useState(false);
  const [shakePin, setShakePin] = useState(false);

  const phoneRef = useRef<HTMLInputElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);

  const isValidPhone = phone.length === 10;
  const isValidPin = pin.length === 4;
  const isValidEmail = email === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const showPhoneError = (phoneTouched || submitted) && !isValidPhone && phone.length > 0;
  const showPhoneRequired = submitted && phone.length === 0;
  const showPinRequired = submitted && pin.length === 0;
  const showPinIncomplete = (submitted) && pin.length > 0 && !isValidPin;
  const showEmailError = (emailTouched || submitted) && email.length > 0 && !isValidEmail;

  const phoneErrorMsg = showPhoneRequired
    ? "Tu WhatsApp es necesario para crear la tarjeta"
    : showPhoneError
      ? "Ingresa los 10 dígitos"
      : null;

  const pinErrorMsg = showPinRequired
    ? "Crea un PIN para recuperar tu tarjeta"
    : showPinIncomplete
      ? "El PIN debe tener 4 dígitos"
      : null;

  const emailErrorMsg = showEmailError ? "Ingresa un email válido" : null;

  const canSubmit = isValidPhone && isValidPin && isValidEmail;

  const handleSubmit = async () => {
    setSubmitted(true);

    if (!canSubmit) {
      if (!isValidPhone) {
        setShakePhone(true);
        setTimeout(() => setShakePhone(false), 500);
        phoneRef.current?.focus();
      } else if (!isValidPin) {
        setShakePin(true);
        setTimeout(() => setShakePin(false), 500);
        pinRef.current?.focus();
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();

      const existing = await getCustomerByPhone(phone);

      if (existing) {
        const existingCard = await getCardByCustomer(existing.id);
        if (existingCard) {
          setError(null);
          router.replace("/recover");
          return;
        }

        const card = await createCard({
          customerRef: existing.id,
        });

        localStorage.setItem("customerId", existing.id);
        localStorage.setItem("cardId", card.id);
        await setCustomerSession(existing.id, card.id);
        hapticCelebration();
        router.replace("/card/" + card.id);
        return;
      }

      let referrerCustomerId: string | undefined;
      // Prioridad: ref (customer ID directo) > cardId (buscar cliente de la tarjeta)
      if (refCustomerId) {
        // Verificar que el customer existe y es activo
        try {
          const { data: refCustomer } = await supabase
            .from("clientes")
            .select("id")
            .eq("negocio_id", NEGOCIO_ID)
            .eq("id", refCustomerId)
            .eq("activo", true)
            .single();
          referrerCustomerId = refCustomer?.id;
        } catch {
          // No bloquear el registro si el lookup falla
        }
      } else if (cardId) {
        try {
          const { data: referrerCard } = await supabase
            .from("tarjetas")
            .select("cliente_id")
            .eq("negocio_id", NEGOCIO_ID)
            .eq("id", cardId)
            .single();
          referrerCustomerId = referrerCard?.cliente_id;
        } catch {
          // No bloquear el registro si el lookup falla
        }
      }

      const pinHmac = await hashCustomerPin(pin);

      const customer = await createCustomer({
        name,
        phone,
        ...(email ? { email } : {}),
        consentWhatsApp,
        ...(email ? { consentEmail } : {}),
        pinHmac,
        ...(referrerCustomerId ? { referrerCustomerId } : {}),
      });

      const card = await createCard({
        customerRef: customer.id,
      });

      localStorage.setItem("customerId", customer.id);
      localStorage.setItem("cardId", card.id);
      await setCustomerSession(customer.id, card.id);

      hapticCelebration();
      router.replace("/card/" + card.id);
    } catch (e: unknown) {
      if (process.env.NODE_ENV === "development") {
        console.error("Onboarding error:", e);
      }
      hapticError();
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      const code = e instanceof Object && "code" in e ? (e as { code: string }).code : undefined;
      if (offline) {
        setError("Sin conexión a internet. Verifica tu red e intenta de nuevo.");
      } else if (code === "permission-denied") {
        setError("No se pudo acceder al servicio. Intenta más tarde.");
      } else {
        setError("Algo salió mal. Intenta de nuevo o visítanos en barra.");
      }
      setLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const onlyNumbers = e.target.value.replace(/\D/g, "");
    setPhone(onlyNumbers.slice(0, 10));
  };

  const completedSteps = (isValidPhone ? 1 : 0) + (isValidPin ? 1 : 0);

  return (
    <div id="main-content" className="min-h-screen bg-stone-50 text-stone-900 dark:bg-neutral-950 dark:text-white flex flex-col">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5">
        <Link
          href="/"
          className="font-mono text-xs font-medium tracking-[0.25em] uppercase text-stone-900 dark:text-stone-200 hover:text-amber-700 dark:hover:text-amber-500 transition-colors duration-300"
        >
          La Commune
        </Link>
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex gap-8">
            <Link
              href="/menu"
              className="font-mono text-xs tracking-[0.12em] uppercase text-stone-400 dark:text-stone-500 hover:text-amber-700 dark:hover:text-amber-500 transition-colors duration-300 relative group"
            >
              Menu
              <span className="absolute bottom-[-2px] left-0 w-0 h-px bg-amber-700 dark:bg-amber-500 group-hover:w-full transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]" />
            </Link>
            <Link
              href="/onboarding"
              className="font-mono text-xs tracking-[0.12em] uppercase text-amber-700 dark:text-amber-500 relative"
            >
              Fidelidad
              <span className="absolute bottom-[-2px] left-0 w-full h-px bg-amber-700 dark:bg-amber-500" />
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </nav>

      {/* Contenido — desktop: 2 columnas */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl flex flex-col desktop-2col">

          {/* Panel izquierdo — solo desktop: branding + valor */}
          <div className="hidden desktop-branding">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.4em] text-stone-400 dark:text-stone-500">
                  Programa de fidelidad
                </p>
                <h2 className="font-display text-5xl xl:text-6xl font-light leading-[1.1]">
                  Tu café te recompensa
                </h2>
                <p className="text-base text-stone-500 dark:text-stone-400 leading-relaxed max-w-md">
                  Junta 5 sellos con cada visita y disfruta tu siguiente bebida por la casa.
                  Solo necesitas tu WhatsApp para empezar.
                </p>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-4">
                  <span className="w-8 h-8 rounded-full border border-stone-300 dark:border-stone-700 flex items-center justify-center text-xs font-medium text-stone-500 dark:text-stone-400">1</span>
                  <span className="text-sm text-stone-600 dark:text-stone-300">Registra tu WhatsApp</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-8 h-8 rounded-full border border-stone-300 dark:border-stone-700 flex items-center justify-center text-xs font-medium text-stone-500 dark:text-stone-400">2</span>
                  <span className="text-sm text-stone-600 dark:text-stone-300">Acumula sellos con cada compra</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-8 h-8 rounded-full border border-stone-300 dark:border-stone-700 flex items-center justify-center text-xs font-medium text-stone-500 dark:text-stone-400">3</span>
                  <span className="text-sm text-stone-600 dark:text-stone-300">Tu bebida de cortesía te espera</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Panel derecho — formulario */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full max-w-sm mx-auto space-y-8 text-center desktop-form-card"
          >
            {/* Referral banner */}
            {(refCustomerId || cardId) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-emerald-800/30 bg-emerald-900/10 px-4 py-3 text-center"
              >
                <p className="text-xs text-emerald-400 tracking-wide">
                  Un amigo te invitó — ambos reciben un sello extra
                </p>
              </motion.div>
            )}

            {/* Header */}
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-light tracking-wide">
                Crea tu tarjeta
              </h1>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Ingresa tu WhatsApp y un PIN de 4 dígitos.
              </p>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full transition-colors duration-300 ${isValidPhone ? "bg-emerald-500" : "bg-stone-300 dark:bg-stone-700"}`} />
                <span className={`text-xs transition-colors duration-300 ${isValidPhone ? "text-emerald-500" : "text-stone-400 dark:text-stone-600"}`}>
                  WhatsApp
                </span>
              </div>
              <span className="w-4 h-px bg-stone-300 dark:bg-stone-700" />
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full transition-colors duration-300 ${isValidPin ? "bg-emerald-500" : "bg-stone-300 dark:bg-stone-700"}`} />
                <span className={`text-xs transition-colors duration-300 ${isValidPin ? "text-emerald-500" : "text-stone-400 dark:text-stone-600"}`}>
                  PIN
                </span>
              </div>
              <span className="ml-1 text-xs text-stone-400 dark:text-stone-600">
                {completedSteps}/2
              </span>
            </div>

            {/* Form */}
            <div className="space-y-5">

              {/* WhatsApp */}
              <motion.div
                className="space-y-1.5"
                animate={shakePhone ? shakeAnimation : {}}
              >
                <label htmlFor="phone" className="block text-xs uppercase tracking-[0.3em] text-left font-medium text-stone-600 dark:text-stone-400">
                  WhatsApp
                </label>
                <Input
                  ref={phoneRef}
                  id="phone"
                  required
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="10 dígitos"
                  maxLength={10}
                  value={phone}
                  onChange={handlePhoneChange}
                  onBlur={() => setPhoneTouched(true)}
                  className={`text-base text-center tracking-widest bg-white dark:bg-neutral-900 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:border-stone-500 ${
                    phoneErrorMsg ? "border-red-400 dark:border-red-500" : "border-stone-300 dark:border-stone-700"
                  }`}
                />
                <div className="flex justify-between items-center min-h-[18px]">
                  {phoneErrorMsg ? (
                    <p className="text-xs text-red-500 dark:text-red-400">{phoneErrorMsg}</p>
                  ) : (
                    <span />
                  )}
                  <p className={`text-xs ${isValidPhone ? "text-emerald-500" : "text-stone-400 dark:text-stone-600"}`}>
                    {phone.length}/10{isValidPhone && " \u2713"}
                  </p>
                </div>
              </motion.div>

              {/* PIN */}
              <motion.div
                className="space-y-1.5"
                animate={shakePin ? shakeAnimation : {}}
              >
                <label htmlFor="pin" className="block text-xs uppercase tracking-[0.3em] text-left font-medium text-stone-600 dark:text-stone-400">
                  PIN de recuperación
                </label>
                <Input
                  ref={pinRef}
                  id="pin"
                  required
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="4 dígitos"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className={`text-base text-center tracking-[0.5em] bg-white dark:bg-neutral-900 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:border-stone-500 ${
                    pinErrorMsg ? "border-red-400 dark:border-red-500" : "border-stone-300 dark:border-stone-700"
                  }`}
                />
                <div className="flex items-center justify-between min-h-[18px]">
                  {pinErrorMsg ? (
                    <p className="text-xs text-red-500 dark:text-red-400">{pinErrorMsg}</p>
                  ) : (
                    <p className="text-xs text-stone-400 dark:text-stone-600 text-left">
                      Para recuperar tu tarjeta si cambias de celular.
                    </p>
                  )}
                  <div className="flex gap-1.5 shrink-0">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full transition-colors duration-200 ${
                          i < pin.length
                            ? "bg-stone-800 dark:bg-stone-200"
                            : "bg-stone-300 dark:bg-stone-700"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Separador visual */}
              <div className="flex items-center gap-3 pt-1">
                <span className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
                <span className="text-xs uppercase tracking-[0.3em] text-stone-400 dark:text-stone-600">
                  Opcional
                </span>
                <span className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
              </div>

              {/* Nombre */}
              <div className="space-y-1.5">
                <label htmlFor="name" className="block text-xs uppercase tracking-[0.3em] text-stone-400 dark:text-stone-600 text-left">
                  Nombre
                </label>
                <Input
                  id="name"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-base text-center bg-white dark:bg-neutral-900 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:border-stone-500"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs uppercase tracking-[0.3em] text-stone-400 dark:text-stone-600 text-left">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  onBlur={() => setEmailTouched(true)}
                  className={`text-base text-center bg-white dark:bg-neutral-900 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:border-stone-500 ${
                    emailErrorMsg ? "border-red-400 dark:border-red-500" : "border-stone-200 dark:border-stone-800"
                  }`}
                />
                {emailErrorMsg && (
                  <p className="text-xs text-red-500 dark:text-red-400">{emailErrorMsg}</p>
                )}
              </div>

              {/* Consents — touch target mejorado */}
              <div className="space-y-3 pt-1">
                <label className="flex items-start gap-3 text-xs text-stone-500 leading-snug text-left cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={consentWhatsApp}
                    onChange={(e) => setConsentWhatsApp(e.target.checked)}
                    className="mt-0.5 accent-stone-400 w-4 h-4 min-w-[16px]"
                  />
                  <span>
                    Acepto recibir mensajes por WhatsApp relacionados con mi tarjeta y
                    promociones del café.
                  </span>
                </label>

                {email && (
                  <label className="flex items-start gap-3 text-xs text-stone-500 leading-snug text-left cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={consentEmail}
                      onChange={(e) => setConsentEmail(e.target.checked)}
                      className="mt-0.5 accent-stone-400 w-4 h-4 min-w-[16px]"
                    />
                    <span>
                      Acepto recibir correos con promociones y novedades del café.
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-500 dark:text-red-400 tracking-wide">{error}</p>
            )}

            {/* CTA */}
            <div className="space-y-4">
              <Button
                className="w-full rounded-full bg-stone-800 text-white dark:bg-white dark:text-neutral-900 py-6 text-sm tracking-wide transition hover:bg-stone-900 dark:hover:bg-stone-100 disabled:opacity-50"
                onClick={handleSubmit}
                disabled={loading}
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
              <p className="text-xs text-stone-400 dark:text-stone-600 tracking-wide">
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
    </div>
  );
}
