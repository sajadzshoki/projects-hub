import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "@/components/icons";

export const inputClasses =
  "w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-muted/50 hover:border-border-strong focus:border-accent disabled:opacity-50";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/** Label + control + error message, one consistent layout for every form field. */
export function Field({ label, hint, error, required, children, className }: FieldProps) {
  return (
    <div className={cn("block", className)}>
      <label className="block">
        <span className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium text-text">
            {label}
            {required && <span className="ml-0.5 text-danger">*</span>}
          </span>
          {hint && <span className="text-[11px] text-muted">{hint}</span>}
        </span>
        {children}
      </label>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClasses, "h-9", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClasses, "resize-y leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn("relative", className)}>
      <select className={cn(inputClasses, "h-9 cursor-pointer appearance-none pr-8")} {...props}>
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
    </div>
  );
}
