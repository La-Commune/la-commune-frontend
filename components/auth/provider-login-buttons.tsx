"use client";

// TODO: This component uses Firebase Auth which is no longer being used.
// The loyalty app uses PIN-based authentication via Supabase instead.

import { FC } from "react";

interface Props {
  onSignIn?: () => void;
}

export const ProviderLoginButtons: FC<Props> = ({ onSignIn }) => {
  return (
    <div className="space-y-2 text-sm text-muted-foreground">
      <p>Provider-based authentication is no longer used.</p>
      <p>Implement PIN-based Supabase authentication instead.</p>
    </div>
  );
};
