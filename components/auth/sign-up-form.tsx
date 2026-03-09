'use client';

// TODO: This component uses Firebase Auth which is no longer being used.
// The loyalty app uses PIN-based authentication via Supabase instead.

import { FC } from "react";
import { Button } from "@/components/ui/button";

interface SignUpFormProps {
  onShowLogin: () => void;
  onSignUp?: () => void;
}

export const SignUpForm: FC<SignUpFormProps> = ({ onShowLogin, onSignUp }) => {
  return (
    <>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Firebase Auth is no longer used. This form should implement PIN-based Supabase authentication.
        </p>
      </div>

      <p className="mt-4 text-sm">
        Already joined?{" "}
        <Button variant="link" onClick={onShowLogin}>
          Sign in instead.
        </Button>
      </p>
    </>
  );
};
