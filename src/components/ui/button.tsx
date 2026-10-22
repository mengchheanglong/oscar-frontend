import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-medium ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-codex-accent text-white shadow-sm hover:bg-codex-hover",
        destructive: "bg-codex-warning text-white shadow-sm hover:bg-red-700",
        outline:
          "border border-border bg-background text-foreground hover:bg-muted hover:border-border",
        secondary: "bg-muted text-foreground hover:bg-accent",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        dark: "bg-codex-navy text-white hover:bg-slate-800 shadow-sm",
        link: "text-codex-accent underline-offset-4 hover:underline",
        glow: "relative bg-codex-accent text-white shadow-[0_0_15px_rgba(67,97,238,0.35)] hover:bg-codex-hover",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-[11px]",
        lg: "h-11 rounded-lg px-6 text-sm",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
