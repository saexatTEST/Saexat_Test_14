import * as React from "react";

import { cn } from "@/lib/utils";

const DEFAULT_MAX_LENGTH = 28;

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, maxLength, ...props }, ref) => {
    const effectiveMax = typeof maxLength === "number" ? maxLength : DEFAULT_MAX_LENGTH;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (typeof val === "string" && val.length > effectiveMax) {
        e.target.value = val.slice(0, effectiveMax);
      }
      onChange?.(e);
    };

    return (
      <input
        type={type}
        maxLength={effectiveMax}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
