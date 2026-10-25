"use client";

import { ArrowUpRightIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

export function AppSlotButton({
  label,
  href,
  variant,
  size,
  disabled,
  type = "button",
  onClick,
}: {
  label: string;
  href?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  disabled?: boolean;
  type?: ComponentProps<typeof Button>["type"];
  onClick?: () => void;
}) {
  if (href) {
    return (
      <Button
        variant={variant}
        size={size}
        render={
          <a
            href={disabled ? undefined : href}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={disabled || undefined}
            tabIndex={disabled ? -1 : undefined}
          />
        }
        disabled={disabled}
      >
        {label}
        <ArrowUpRightIcon data-icon="inline-end" aria-hidden="true" />
      </Button>
    );
  }

  return (
    <Button type={type} variant={variant} size={size} disabled={disabled} onClick={onClick}>
      {label}
    </Button>
  );
}
