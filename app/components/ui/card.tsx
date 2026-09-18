import * as React from "react";
import { cn } from "@/lib/utils";

// Pastel note colors live as tokens in app/globals.css (--color-note-*).
const noteColors = {
  one: "bg-note-1",
  two: "bg-note-2",
  three: "bg-note-3",
  four: "bg-note-4",
  five: "bg-note-5",
  six: "bg-note-6",
  seven: "bg-note-7",
  eight: "bg-note-8",
  nine: "bg-note-9",
} as const;

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { color?: keyof typeof noteColors }
>(({ className, color = "one", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl text-slate-900 shadow-sm ring-1 ring-black/5 transition-[background-color,box-shadow] duration-200 hover:shadow-md",
      noteColors[color],
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col p-4 pb-2", className)}
    {...props}
  />
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
      "mt-auto flex items-center justify-end gap-1 p-2 pt-0",
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
