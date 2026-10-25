"use client";

import type { ReactNode } from "react";
import type { z } from "zod";
import type { contract } from "@/lib/patchsmith";
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPanel,
  DialogFooter,
} from "@/components/ui/dialog";

type AppFormProps = z.infer<typeof contract.components.Form.fields> & {
  children?: ReactNode;
  onSubmit?: () => unknown;
};

export function AppForm({ disabled, onSubmit, children }: AppFormProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled) onSubmit?.();
      }}
    >
      {children}
    </form>
  );
}

type AppDialogProps = z.infer<typeof contract.components.Dialog.fields> & {
  children?: ReactNode;
  onOpenChange?: (event: { open: boolean }) => unknown;
};

export function AppDialog({ open, title, description, onOpenChange, children }: AppDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(open) => onOpenChange?.({ open })}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogPanel>{children}</DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}

export function AppDialogActions({ children }: { children?: ReactNode }) {
  return (
    <DialogFooter variant="bare" className="flex-row justify-end px-0 pb-0">
      {children}
    </DialogFooter>
  );
}
