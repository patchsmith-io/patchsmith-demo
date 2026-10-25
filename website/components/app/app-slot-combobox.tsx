"use client";

import { useId } from "react";
import type { z } from "zod";
import type { contract } from "@/lib/patchsmith";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from "@/components/ui/combobox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";

export type AppSlotComboboxProps = z.infer<typeof contract.components.Combobox.fields> & {
  onChange?: (input: { value: string | null }) => void;
};

export function AppSlotCombobox({
  label,
  value,
  options,
  placeholder = "Search options…",
  emptyMessage = "No results found.",
  loading = false,
  clearable = true,
  required,
  disabled,
  onChange,
}: AppSlotComboboxProps) {
  const id = useId();
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Combobox
        items={options}
        value={options.find((option) => option.value === value) ?? null}
        disabled={disabled || loading}
        required={required}
        autoHighlight
        isItemEqualToValue={(option, selected) => option.value === selected.value}
        filter={(option, query) =>
          `${option.label} ${option.description ?? ""}`
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase())
        }
        onValueChange={(option) => onChange?.({ value: option?.value ?? null })}
      >
        <div className="relative w-full">
          <ComboboxInput
            id={id}
            aria-busy={loading || undefined}
            placeholder={placeholder}
            showTrigger={!loading}
            showClear={clearable && !loading && value !== null}
            triggerProps={{ "aria-label": `Show ${label.toLocaleLowerCase()} options` }}
            clearProps={{ "aria-label": `Clear ${label.toLocaleLowerCase()}` }}
          />
          {loading ? (
            <Spinner
              className="pointer-events-none absolute end-2 top-1/2 size-4 -translate-y-1/2"
              aria-label={`Loading ${label.toLocaleLowerCase()} options`}
            />
          ) : null}
        </div>
        <ComboboxPopup>
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
          <ComboboxList>
            {(option) => (
              <ComboboxItem key={option.value} value={option}>
                <span className="flex flex-col">
                  <span>{option.label}</span>
                  {option.description ? (
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  ) : null}
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxPopup>
      </Combobox>
    </Field>
  );
}
