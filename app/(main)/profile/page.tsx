"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getSupabase, NEGOCIO_ID } from "@/lib/supabase";
import { maskPhone, getTierLevel, formatMonthYear } from "@/lib/profile-format";
import { Customer } from "@/models/customer.model";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { logger } from "@/lib/logger";
import {
  getCustomerSession,
  clearCustomerSession,
  updateCustomerPhone as updatePhoneSession,
} from "@/app/actions/customerSession";
import { getReferralCount, updateCustomerEmail } from "@/services/customer.service";
import { getCustomerStats } from "@/services/card.service";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { EmptyState, PageLoading } from "@/components/ui/EmptyState";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { Achievements } from "@/components/ui/Achievements";

type CustomerStats = Awaited<ReturnType<typeof getCustomerStats>>;

// ——— Inline Toast ———
function ProfileToast({
  message,
  type,
  onDismiss,
}: {
  message: string;
  type: "error" | "success";
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const colors =
    type === "error"
      ? "border-red-200/50 dark:border-red-800/30 bg-white/90 dark:bg-neutral-900/90 text-red-600 dark:text-red-400"
      : "border-emerald-200/50 dark:border-emerald-800/30 bg-white/90 dark:bg-neutral-900/90 text-emerald-600 dark:text-emerald-400";

  const dot = type === "error" ? "bg-red-500" : "bg-emerald-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-2.5 rounded-full border backdrop-blur-sm shadow-lg ${colors}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse`} />
      <span className="text-xs tracking-wide whitespace-nowrap">{message}</span>
    </motion.div>
  );
}

// Inline edit form para teléfono
function PhoneEditForm({
  currentPhone,
  onSave,
  onCancel,
  loading,
}: {
  currentPhone: string;
  onSave: (newPhone: string, pin: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [phone, setPhone] = useState(currentPhone);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError("El teléfono no puede estar vacío");
      return;
    }
    if (!pin.trim()) {
      setError("Ingresa tu PIN para confirmar");
      return;
    }
    setError("");
    onSave(phone, pin);
  };

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      onSubmit={handleSubmit}
      className="space-y-3 mt-3"
    >
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400 uppercase tracking-[0.25em]">
          Nuevo teléfono
        </label>
        <input
          ref={inputRef}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-4 py-2 bg-stone-100 dark:bg-neutral-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:border-amber-500"
          placeholder="1234567890"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400 uppercase tracking-[0.25em]">
          PIN de confirmación
        </label>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full px-4 py-2 bg-stone-100 dark:bg-neutral-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:border-amber-500"
          placeholder="••••"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <LoadingButton
          type="submit"
          variant="default"
          size="sm"
          loading={loading}
          className="flex-1"
        >
          Guardar
        </LoadingButton>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-neutral-800 transition"
        >
          Cancelar
        </button>
      </div>
    </motion.form>
  );
}

// Inline edit form para correo
function EmailEditForm({
  currentEmail,
  onSave,
  onCancel,
  loading,
}: {
  currentEmail: string;
  onSave: (newEmail: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [email, setEmail] = useState(currentEmail);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("El correo no puede estar vacío");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Ingresa un correo válido");
      return;
    }
    setError("");
    onSave(email);
  };

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      onSubmit={handleSubmit}
      className="space-y-3 mt-3"
    >
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400 uppercase tracking-[0.25em]">
          Correo electrónico
        </label>
        <input
          ref={inputRef}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 bg-stone-100 dark:bg-neutral-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:border-amber-500"
          placeholder="hola@example.com"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <LoadingButton
          type="submit"
          variant="default"
          size="sm"
          loading={loading}
          className="flex-1"
        >
          Guardar
        </LoadingButton>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-neutral-800 transition"
        >
          Cancelar
        </button>
      </div>
    </motion.form>
  );
}

// Inline edit form para nombre
function NameEditForm({
  currentName,
  onSave,
  onCancel,
  loading,
}: {
  currentName: string;
  onSave: (newName: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre no puede estar vacío");
      return;
    }
    setError("");
    onSave(name);
  };

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      onSubmit={handleSubmit}
      className="space-y-3 mt-3"
    >
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400 uppercase tracking-[0.25em]">
          Nombre
        </label>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 bg-stone-100 dark:bg-neutral-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:border-amber-500"
          placeholder="Tu nombre"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <LoadingButton
          type="submit"
          variant="default"
          size="sm"
          loading={loading}
          className="flex-1"
        >
          Guardar
        </LoadingButton>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-neutral-800 transition"
        >
          Cancelar
        </button>
      </div>
    </motion.form>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [referralCount, setReferralCount] = useState(0);

  // Edit states
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const showToast = (message: string, type: "error" | "success" = "error") => setToast({ message, type });

  // Logout confirmation
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  // Preferences states
  const [consentWhatsApp, setConsentWhatsApp] = useState(false);
  const [consentEmail, setConsentEmail] = useState(false);
  const push = usePushNotifications(customerId || undefined);

  // Session resolution (same pattern as card page)
  useEffect(() => {
    (async () => {
      try {
        // Try to get customerId from localStorage first
        let cid = typeof window !== "undefined" ? localStorage.getItem("customerId") : null;

        // Fallback to cookie
        if (!cid) {
          const session = await getCustomerSession();
          if (session) cid = session.customerId;
        }

        if (!cid) {
          router.replace("/recover");
          return;
        }

        setCustomerId(cid);
      } catch (error) {
        logger.error("profile", "Error al resolver sesión", error);
        router.replace("/recover");
      }
    })();
  }, [router]);

  // Fetch customer data + stats + referral count
  useEffect(() => {
    if (!customerId) return;

    (async () => {
      try {
        const supabase = getSupabase();

        // Fetch customer
        const { data: clienteRow, error: clienteError } = await supabase
          .from("clientes")
          .select("*")
          .eq("id", customerId)
          .eq("negocio_id", NEGOCIO_ID)
          .single();

        if (clienteError || !clienteRow) {
          router.replace("/recover");
          return;
        }

        const mappedCustomer: Customer = {
          name: clienteRow.nombre,
          phone: clienteRow.telefono,
          email: clienteRow.email,
          active: clienteRow.activo,
          totalVisits: clienteRow.total_visitas,
          totalStamps: clienteRow.total_sellos,
          createdAt: new Date(clienteRow.creado_en),
          lastVisitAt: clienteRow.ultima_visita ? new Date(clienteRow.ultima_visita) : undefined,
          consentWhatsApp: clienteRow.consentimiento_whatsapp,
          consentEmail: clienteRow.consentimiento_email,
          pinHmac: clienteRow.pin_hmac,
          notes: clienteRow.notas,
          referrerCustomerId: clienteRow.id_referidor,
          referralBonusGiven: clienteRow.bono_referido_entregado,
          schemaVersion: 1,
        };

        setCustomer(mappedCustomer);
        setConsentWhatsApp(mappedCustomer.consentWhatsApp ?? false);
        setConsentEmail(mappedCustomer.consentEmail ?? false);

        // Fetch stats
        const statsData = await getCustomerStats(customerId);
        setStats(statsData);

        // Fetch referral count
        const refCount = await getReferralCount(customerId);
        setReferralCount(refCount);

        setLoading(false);
      } catch (error) {
        logger.error("profile", "Error al cargar datos", error);
        setLoading(false);
      }
    })();
  }, [customerId, router]);

  // Realtime listener para cambios en el cliente
  useEffect(() => {
    if (!customerId) return;

    const supabase = getSupabase();
    const channel = supabase
      .channel(`customer-${customerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clientes",
          filter: `id=eq.${customerId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            router.replace("/recover");
            return;
          }
          const row = payload.new as Record<string, unknown>;
          if (row.activo === false) {
            router.replace("/recover");
            return;
          }
          // Update customer data
          setCustomer((prev) => ({
            ...prev!,
            name: (row.nombre as string) || prev?.name,
            email: (row.email as string) || prev?.email,
            phone: (row.telefono as string) || prev?.phone,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId, router]);

  // Handle phone update with PIN verification
  const handlePhoneUpdate = async (newPhone: string, pin: string) => {
    if (!customerId) return;
    setUpdating(true);
    try {
      const result = await updatePhoneSession(customerId, pin, newPhone);
      if (!result.ok) {
        showToast(result.error);
        return;
      }
      setCustomer((prev) => (prev ? { ...prev, phone: newPhone } : null));
      setEditingPhone(false);
      showToast("Teléfono actualizado", "success");
    } catch (error) {
      logger.error("profile", "Error al actualizar teléfono", error);
      showToast("Error al actualizar el teléfono");
    } finally {
      setUpdating(false);
    }
  };

  // Handle email update
  const handleEmailUpdate = async (newEmail: string) => {
    if (!customerId) return;
    setUpdating(true);
    try {
      await updateCustomerEmail(customerId, newEmail, consentEmail);
      setCustomer((prev) => (prev ? { ...prev, email: newEmail } : null));
      setEditingEmail(false);
      showToast("Correo actualizado", "success");
    } catch (error) {
      logger.error("profile", "Error al actualizar correo", error);
      showToast("Error al actualizar el correo");
    } finally {
      setUpdating(false);
    }
  };

  // Handle name update
  const handleNameUpdate = async (newName: string) => {
    if (!customerId) return;
    setUpdating(true);
    try {
      const supabase = getSupabase();
      await supabase
        .from("clientes")
        .update({ nombre: newName })
        .eq("id", customerId)
        .eq("negocio_id", NEGOCIO_ID);

      setCustomer((prev) => (prev ? { ...prev, name: newName } : null));
      setEditingName(false);
      showToast("Nombre actualizado", "success");
    } catch (error) {
      logger.error("profile", "Error al actualizar nombre", error);
      showToast("Error al actualizar el nombre");
    } finally {
      setUpdating(false);
    }
  };

  // Handle logout (with confirmation)
  const handleLogout = async () => {
    if (!confirmingLogout) {
      setConfirmingLogout(true);
      return;
    }
    try {
      localStorage.removeItem("customerId");
      localStorage.removeItem("cardId");
      await clearCustomerSession();
      router.replace("/");
    } catch (error) {
      logger.error("profile", "Error al cerrar sesión", error);
    }
  };

  // Loading state
  if (loading) {
    return <PageLoading />;
  }

  if (!customer || !stats) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-neutral-950 dark:text-white flex flex-col">
        <nav className="flex items-center justify-between px-6 sm:px-10 py-5">
          <Link
            href="/"
            className="font-mono text-xs font-medium tracking-[0.25em] uppercase text-stone-900 dark:text-stone-200 hover:text-amber-700 dark:hover:text-amber-500 transition-colors duration-300"
          >
            La Commune
          </Link>
          <ThemeToggle />
        </nav>
        <div className="flex-1 flex items-center justify-center px-6">
          <EmptyState illustration="error" title="Error al cargar tu perfil" />
        </div>
      </div>
    );
  }

  const tier = getTierLevel(customer.totalVisits ?? 0);
  const tierColors: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40 text-blue-600 dark:text-blue-400",
    amber: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40 text-amber-600 dark:text-amber-400",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400",
    purple: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/40 text-purple-600 dark:text-purple-400",
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-neutral-950 dark:text-white">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <ProfileToast
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-stone-200 dark:border-stone-800">
        <Link
          href="/"
          className="font-mono text-xs font-medium tracking-[0.25em] uppercase text-stone-900 dark:text-stone-200 hover:text-amber-700 dark:hover:text-amber-500 transition-colors duration-300"
        >
          La Commune
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/menu"
            className="text-xs uppercase tracking-[0.3em] text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors group"
          >
            Menú
            <span aria-hidden="true" className="w-4 h-px bg-stone-400 dark:bg-stone-500 group-hover:w-7 group-hover:bg-stone-900 dark:group-hover:bg-white transition-all duration-500 inline-block ml-2" />
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      {/* Contenido */}
      <div className="max-w-2xl mx-auto px-6 sm:px-10 py-12 space-y-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-4"
        >
          <div className="flex items-start gap-4">
            {/* Avatar con iniciales */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 dark:from-amber-600 dark:to-amber-900 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20"
            >
              <span className="text-white text-lg sm:text-xl font-light uppercase tracking-wider">
                {(customer.name || "?").split(" ").map(w => w[0]).slice(0, 2).join("")}
              </span>
            </motion.div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <h1 className="font-display text-3xl sm:text-4xl font-light tracking-wide truncate">
                    {customer.name || "Mi perfil"}
                  </h1>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Cliente desde {formatMonthYear(customer.createdAt)}
                  </p>
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className={`px-3 py-1 rounded-full border text-xs font-medium uppercase tracking-[0.2em] shrink-0 ${tierColors[tier.color]}`}
                >
                  {tier.name}
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-3 gap-4"
        >
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-neutral-900 p-4 text-center">
            <p className="text-2xl sm:text-3xl font-light text-amber-600 dark:text-amber-400">
              {customer.totalVisits ?? 0}
            </p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 uppercase tracking-[0.25em] mt-1">
              Visitas
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-neutral-900 p-4 text-center">
            <p className="text-2xl sm:text-3xl font-light text-emerald-600 dark:text-emerald-400">
              {stats.totalRedemptions}
            </p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 uppercase tracking-[0.25em] mt-1">
              Cortesías
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-neutral-900 p-4 text-center">
            <p className="text-2xl sm:text-3xl font-light text-purple-600 dark:text-purple-400">
              {referralCount}
            </p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 uppercase tracking-[0.25em] mt-1">
              Referidos
            </p>
          </div>
        </motion.div>

        {/* Achievements */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="w-full max-w-sm mx-auto rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-neutral-900 px-5 py-5"
          >
            <Achievements stats={stats} referralCount={referralCount} />
          </motion.div>
        )}

        {/* Personal Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-4"
        >
          <h2 className="text-sm font-medium uppercase tracking-[0.25em] text-stone-600 dark:text-stone-400">
            Información personal
          </h2>

          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-neutral-900 p-6 space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400 uppercase tracking-[0.25em]">
                Nombre
              </label>
              <div className="flex items-center justify-between">
                <p className="text-base text-stone-900 dark:text-white">
                  {customer.name || "Sin nombre"}
                </p>
                {!editingName && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition"
                  >
                    Editar
                  </button>
                )}
              </div>
              <AnimatePresence>
                {editingName && (
                  <NameEditForm
                    currentName={customer.name || ""}
                    onSave={handleNameUpdate}
                    onCancel={() => setEditingName(false)}
                    loading={updating}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400 uppercase tracking-[0.25em]">
                Teléfono
              </label>
              <div className="flex items-center justify-between">
                <p className="text-base text-stone-900 dark:text-white font-mono">
                  {maskPhone(customer.phone || "")}
                </p>
                {!editingPhone && (
                  <button
                    onClick={() => setEditingPhone(true)}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition"
                  >
                    Cambiar
                  </button>
                )}
              </div>
              <AnimatePresence>
                {editingPhone && (
                  <PhoneEditForm
                    currentPhone={customer.phone || ""}
                    onSave={handlePhoneUpdate}
                    onCancel={() => setEditingPhone(false)}
                    loading={updating}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400 uppercase tracking-[0.25em]">
                Correo electrónico
              </label>
              <div className="flex items-center justify-between">
                <p className="text-base text-stone-900 dark:text-white">
                  {customer.email || "Sin correo"}
                </p>
                {!editingEmail && (
                  <button
                    onClick={() => setEditingEmail(true)}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition"
                  >
                    {customer.email ? "Editar" : "Agregar"}
                  </button>
                )}
              </div>
              <AnimatePresence>
                {editingEmail && (
                  <EmailEditForm
                    currentEmail={customer.email || ""}
                    onSave={handleEmailUpdate}
                    onCancel={() => setEditingEmail(false)}
                    loading={updating}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Preferences Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="space-y-4"
        >
          <h2 className="text-sm font-medium uppercase tracking-[0.25em] text-stone-600 dark:text-stone-400">
            Preferencias
          </h2>

          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-neutral-900 p-6 space-y-5">
            {/* Push Notifications */}
            {push.isSupported && (
              <div className="flex items-center justify-between py-3 border-b border-stone-200 dark:border-stone-800">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-stone-900 dark:text-white">
                    Notificaciones push
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Recibe actualizaciones sobre tu tarjeta
                  </p>
                </div>
                <button
                  onClick={push.isSubscribed ? push.unsubscribe : push.subscribe}
                  disabled={push.loading}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    push.isSubscribed
                      ? "bg-amber-500 dark:bg-amber-600"
                      : "bg-stone-300 dark:bg-stone-700"
                  } ${push.loading ? "opacity-50" : ""}`}
                  aria-label="Toggle push notifications"
                >
                  <motion.div
                    initial={false}
                    animate={{ x: push.isSubscribed ? 22 : 2 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
                  />
                </button>
              </div>
            )}

            {/* WhatsApp Consent */}
            <div className="flex items-center justify-between py-3 border-b border-stone-200 dark:border-stone-800">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-stone-900 dark:text-white">
                  Mensajes por WhatsApp
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Ofertas y novedades exclusivas
                </p>
              </div>
              <button
                onClick={async () => {
                  setConsentWhatsApp(!consentWhatsApp);
                  try {
                    const supabase = getSupabase();
                    await supabase
                      .from("clientes")
                      .update({ consentimiento_whatsapp: !consentWhatsApp })
                      .eq("id", customerId)
                      .eq("negocio_id", NEGOCIO_ID);
                  } catch (error) {
                    logger.error("profile", "Error al actualizar consentimiento WhatsApp", error);
                    setConsentWhatsApp(!consentWhatsApp); // Revert
                  }
                }}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  consentWhatsApp
                    ? "bg-amber-500 dark:bg-amber-600"
                    : "bg-stone-300 dark:bg-stone-700"
                }`}
                aria-label="Toggle WhatsApp consent"
              >
                <motion.div
                  initial={false}
                  animate={{ x: consentWhatsApp ? 22 : 2 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
                />
              </button>
            </div>

            {/* Email Consent (only if email exists) */}
            {customer.email && (
              <div className="flex items-center justify-between py-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-stone-900 dark:text-white">
                    Mensajes por correo
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Confirmaciones y recomendaciones
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setConsentEmail(!consentEmail);
                    try {
                      const supabase = getSupabase();
                      await supabase
                        .from("clientes")
                        .update({ consentimiento_email: !consentEmail })
                        .eq("id", customerId)
                        .eq("negocio_id", NEGOCIO_ID);
                    } catch (error) {
                      logger.error("profile", "Error al actualizar consentimiento email", error);
                      setConsentEmail(!consentEmail); // Revert
                    }
                  }}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    consentEmail
                      ? "bg-amber-500 dark:bg-amber-600"
                      : "bg-stone-300 dark:bg-stone-700"
                  }`}
                  aria-label="Toggle email consent"
                >
                  <motion.div
                    initial={false}
                    animate={{ x: consentEmail ? 22 : 2 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
                  />
                </button>
              </div>
            )}

            {/* Theme Toggle */}
            <div className="flex items-center justify-between pt-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-stone-900 dark:text-white">
                  Modo oscuro
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Alterna entre temas claro y oscuro
                </p>
              </div>
              <ThemeToggle className="p-0 w-11 h-6 rounded-full" />
            </div>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="pt-6 border-t border-stone-200 dark:border-stone-800"
        >
          <AnimatePresence mode="wait">
            {!confirmingLogout ? (
              <motion.button
                key="logout-trigger"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleLogout}
                className="w-full px-6 py-3 rounded-full text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
              >
                Cerrar sesión
              </motion.button>
            ) : (
              <motion.div
                key="logout-confirm"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="space-y-3 text-center"
              >
                <p className="text-sm text-stone-600 dark:text-stone-400">
                  ¿Seguro que quieres cerrar sesión?
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleLogout}
                    className="px-6 py-2.5 rounded-full text-xs font-medium uppercase tracking-[0.2em] text-white bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 transition-colors"
                  >
                    Sí, cerrar
                  </button>
                  <button
                    onClick={() => setConfirmingLogout(false)}
                    className="px-6 py-2.5 rounded-full text-xs font-medium uppercase tracking-[0.2em] text-stone-600 dark:text-stone-400 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Back to Card Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center pb-6"
        >
          <Link
            href="/card"
            className="text-xs text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400 transition-colors underline underline-offset-2"
          >
            Volver a mi tarjeta
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
