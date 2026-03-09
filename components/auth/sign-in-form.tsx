'use client';

// TODO: This component uses Firebase Auth which is no longer being used.
// The loyalty app uses PIN-based authentication via Supabase instead.

import { FC } from "react";
import { Button } from "@/components/ui/button";

interface SignInFormProps {
  onShowSignUp: () => void;
}

export const SignInForm: FC<SignInFormProps> = ({ onShowSignUp }) => {
  return (
    <>
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Firebase Auth is no longer used. This form should implement PIN-based Supabase authentication.
        </p>
      </div>
      <p className="mt-4 text-sm">
        Not a member?{" "}
        <Button variant="link" onClick={onShowSignUp}>
          Sign up instead.
        </Button>
      </p>
    </>
  );
};
