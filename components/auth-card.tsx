"use client";

// TODO: This component uses Firebase Auth which is no longer being used.
// The loyalty app uses PIN-based authentication via Supabase instead.
// This file is kept for reference but should be replaced with appropriate auth UI.

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const AuthCard = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Authentication Placeholder</CardTitle>
        <CardDescription>
          Firebase Auth is no longer used. This page should implement PIN-based Supabase authentication.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This component needs to be updated to use Supabase PIN authentication instead of Firebase Auth.
        </p>
      </CardContent>
    </Card>
  );
};
