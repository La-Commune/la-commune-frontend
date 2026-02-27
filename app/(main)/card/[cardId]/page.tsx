"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { StampCardView } from "@/components/ui/stamp-card";
import { DownloadCardButton } from "@/components/ui/DownloadCardButton";
import { doc } from "firebase/firestore";
import { useFirestore, useFirestoreDocData } from "reactfire";
import { Customer } from "@/models/customer.model";
import { formatDate } from "@/lib/utils";


export default function CardEntry({
  params,
}: {
  params: { cardId: string };
}) {
  const router = useRouter();
  const firestore = useFirestore();

  const [loading, setLoading] = useState(true);
  const [cardId, setCardId] = useState<string | null>(null);

  const customerId =
    typeof window !== "undefined"
      ? localStorage.getItem("customerId")
      : null;

  const customerRef = customerId
    ? doc(firestore, "customers", customerId)
    : null;

  const { data: customer } = useFirestoreDocData(customerRef!, {
    suspense: false,
  });

  useEffect(() => {
    const storedCardId = localStorage.getItem("cardId");

    if (!storedCardId || storedCardId !== params.cardId) {
      router.replace(`/onboarding?cardId=${params.cardId}`);
      return;
    }

    setCardId(storedCardId);

    const timer = setTimeout(() => {
      setLoading(false);
    }, 1800);

    return () => clearTimeout(timer);
  }, [params.cardId, router]);

  useEffect(() => {
    if (customer) {
      console.log("Customer data:", customer as Customer);
    }
  }, [customer]);

  if (loading || !cardId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-stone-500 animate-pulse">
          Cargando tu tarjeta…
        </p>
      </div>
    );
  }

  return <Card cardId={cardId} customer={customer as Customer} />;
}


function Card({
  cardId,
  customer,
}: {
  cardId: string;
  customer?: Customer;
}) {
  const name = customer?.name?.trim();
  const lastVisit = formatDate(customer?.lastVisitAt);

  return (
    <div className="flex grow flex-col items-center justify-center gap-10 px-4">
      <section className="text-center space-y-2 max-w-sm">
        <h1 className="font-display text-2xl font-medium text-stone-800">
          {name ? `Hola, ${name} ☕` : "Hola ☕"}
        </h1>

        <p className="text-sm text-stone-500">
          Esta es tu tarjeta digital
        </p>
      </section>

      <StampCardView cardId={cardId} />

      <DownloadCardButton />
    </div>
  );
}
