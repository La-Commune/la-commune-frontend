"use client";

// TODO: This component uses Firebase Auth which is no longer being used.
// The loyalty app uses PIN-based authentication via Supabase instead.

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

export function UserNav() {
  const router = useRouter();
  const doLogout = async () => {
    toast({
      title: "Logged out",
      description: "You have been logged out.",
    });
    router.replace("/");
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <div className="h-10 w-10 rounded-full bg-stone-300 dark:bg-stone-700" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={doLogout}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
