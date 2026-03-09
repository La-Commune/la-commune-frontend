"use client";

// TODO: This component uses Firebase Auth which is no longer being used.
// The loyalty app uses PIN-based authentication via Supabase instead.

import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { FC } from "react";

export const NavbarUserLinks: FC = () => {
  // TODO: Replace with actual Supabase auth check
  const isAuthenticated = false;

  return (
    <>
      {isAuthenticated ? (
        <>
          <Link href="/app" className={buttonVariants()}>
            Dashboard
          </Link>
        </>
      ) : (
        <>
          <Link href="/login" className={buttonVariants()}>
            Login / Register &rarr;
          </Link>
        </>
      )}
    </>
  );
};
