import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "icon" | "icon-sm";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary: "border border-border bg-surface-2 text-text hover:border-border-strong hover:bg-border/30",
  ghost: "text-muted hover:bg-surface-2 hover:text-text",
  danger: "bg-red-600 text-white hover:bg-red-500",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-3.5 text-sm",
  icon: "h-9 w-9",
  "icon-sm": "h-8 w-8",
};

export function buttonClasses(
  opts: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}
): string {
  const { variant = "secondary", size = "md", className } = opts;
  return cn(
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = "secondary", size = "md", className, ...props }: ButtonProps) {
  return <button className={buttonClasses({ variant, size, className })} {...props} />;
}

/** Compact icon-only action button (cards, toolbars). `href` starting with http opens a new tab. */
export function IconButton({
  href,
  title,
  onClick,
  className,
  children,
}: {
  href?: string;
  title: string;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}) {
  const classes = cn(
    "grid h-8 w-8 place-items-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
    className
  );
  if (href) {
    const external = /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        title={title}
        aria-label={title}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        className={classes}
      >
        {children}
      </a>
    );
  }
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
