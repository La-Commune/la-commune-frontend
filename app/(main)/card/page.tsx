"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CardPage() {
  const router = useRouter();

  useEffect(() => {
    const customerId = localStorage.getItem("customerId");

    if (!customerId) {
      router.replace("/onboarding");
    }
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-4">
      <h1 className="text-2xl font-bold mb-4">Card Page</h1>
      <p>This is the card page content.</p>
    </div>
  );
}
