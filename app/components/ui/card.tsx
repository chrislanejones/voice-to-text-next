import * as React from "react";
import { cn } from "@/lib/utils";

const brightColors = {
  one: "oklch(0.89 0.16 0)",
  two: "oklch(0.89 0.16 40)",
  three: "oklch(0.89 0.16 80)",
  four: "oklch(0.89 0.16 120)",
  five: "oklch(0.89 0.16 160)",
  six: "oklch(0.89 0.16 200)",
  seven: "oklch(0.89 0.16 240)",
  eight: "oklch(0.89 0.16 280)",
  nine: "oklch(0.89 0.16 320)",
};

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { color?: keyof typeof brightColors }
>(({ className, color = "one", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border border-gray-700 text-black shadow-sm",
      className
    )}
    style={{ backgroundColor: brightColors[color] }}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col p-4", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-sm font-medium leading-tight line-clamp-2", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-gray-400 mt-1 line-clamp-1", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-end gap-2 p-2 pt-0 mt-auto",
      className
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
