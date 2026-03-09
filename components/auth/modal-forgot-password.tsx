// TODO: This component uses Firebase Auth which is no longer being used.
// The loyalty app uses PIN-based authentication via Supabase instead.

import { FC } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ModalChangePasswordProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const ModalForgotPassword: FC<ModalChangePasswordProps> = ({
  isOpen,
  setIsOpen,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Password Reset</DialogTitle>
          <DialogDescription>
            Firebase Auth is no longer used. This dialog should implement PIN-based Supabase password reset.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
