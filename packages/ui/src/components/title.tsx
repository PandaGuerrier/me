import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@workspace/ui/lib/utils";

// <mark> inside a title highlights a word in pink, like the BDE site headings.
const titleVariants = cva(
  "font-black text-balance uppercase [&_mark]:bg-transparent [&_mark]:text-primary",
  {
    variants: {
      size: {
        "2xl":
          "text-[clamp(3.6rem,6.4vw,6.8rem)] leading-[0.95] tracking-[-0.07em]",
        xl: "text-[clamp(3rem,5.4vw,5.8rem)] leading-[0.95] tracking-[-0.07em]",
        lg: "text-[clamp(2.25rem,4vw,3.75rem)] leading-[0.95] tracking-[-0.06em]",
        md: "text-3xl leading-none tracking-[-0.04em] md:text-4xl",
        sm: "text-2xl leading-tight tracking-[-0.03em]",
        xs: "text-lg leading-snug tracking-[-0.02em]",
      },
      variant: {
        default: "text-foreground",
        primary: "text-primary [&_mark]:text-foreground",
        muted: "text-muted-foreground",
        gold: "text-gold",
      },
    },
    defaultVariants: {
      size: "md",
      variant: "default",
    },
  },
);

type TitleProps = React.ComponentProps<"h2"> &
  VariantProps<typeof titleVariants> & {
    as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p";
    asChild?: boolean;
  };

function Title({
  className,
  size = "md",
  variant = "default",
  as = "h2",
  asChild = false,
  ...props
}: TitleProps) {
  const Comp = asChild ? Slot.Root : as;

  return (
    <Comp
      data-slot="title"
      data-size={size}
      data-variant={variant}
      className={cn(titleVariants({ size, variant }), className)}
      {...props}
    />
  );
}

export { Title, titleVariants };
