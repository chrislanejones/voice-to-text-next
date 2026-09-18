import React from "react";
import { Trash2, Maximize2, Copy } from "lucide-react";
import { Card, CardHeader, CardFooter } from "./ui/card";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const colorKeys = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
] as const;

// Icon buttons on the pastel notes: 36px targets. Notes are light in both
// themes, so the focus ring is a fixed dark slate (10.7:1 or better on
// every note color) instead of the theme ring.
const noteAction =
  "inline-flex size-9 items-center justify-center rounded-lg text-slate-900/75 transition-colors hover:bg-black/10 hover:text-slate-900 active:bg-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900";

const CardSectionItem: React.FC<{
  text: string;
  onDelete: () => void;
  onOpen: () => void;
  color: (typeof colorKeys)[number];
  // AnimatePresence's popLayout measures the exiting card through this ref.
  ref?: React.Ref<HTMLLIElement>;
}> = ({ text, onDelete, onOpen, color, ref }) => {
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast({
      description: "Text copied to clipboard",
      duration: 2000,
    });
  };

  return (
    <motion.li
      ref={ref}
      layout={!reduceMotion}
      initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.95 }}
      transition={{
        duration: reduceMotion ? 0.15 : 0.2,
        ease: "easeOut",
      }}
    >
      <Card className="flex h-full flex-col sm:min-h-28" color={color}>
        <CardHeader>
          <p className="line-clamp-3 text-sm leading-relaxed">{text}</p>
        </CardHeader>
        {/* Delete sits apart from Copy and Open so it's harder to hit by
            mistake. DOM order matches the visual order. */}
        <CardFooter>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={`${noteAction} mr-auto`}
            aria-label="Delete note"
            title="Delete note"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className={noteAction}
            aria-label="Copy note"
            title="Copy note"
          >
            <Copy className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className={noteAction}
            aria-label="Open note"
            title="Open note"
          >
            <Maximize2 className="size-4" aria-hidden="true" />
          </button>
        </CardFooter>
      </Card>
    </motion.li>
  );
};

interface CardSectionProps {
  history: string[];
  onDeleteHistory: (index: number) => void;
  onOpenModal: (text: string) => void;
}

const CardSection: React.FC<CardSectionProps> = ({
  history,
  onDeleteHistory,
  onOpenModal,
}) => {
  if (history.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No saved notes yet.
      </p>
    );
  }

  // Keys follow the note, not its position, so deleting one card doesn't
  // remount the rest. Repeated text gets a counter to stay unique.
  const seen = new Map<string, number>();
  const items = history.map((text, index) => {
    const n = seen.get(text) ?? 0;
    seen.set(text, n + 1);
    return { text, index, key: `${n}-${text}` };
  });

  return (
    <ul
      role="list"
      className="relative grid grid-cols-1 gap-3 sm:auto-rows-fr sm:grid-cols-2 lg:grid-cols-3"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {items.map(({ text, index, key }) => (
          <CardSectionItem
            key={key}
            text={text}
            onDelete={() => onDeleteHistory(index)}
            onOpen={() => onOpenModal(text)}
            color={colorKeys[index % colorKeys.length]}
          />
        ))}
      </AnimatePresence>
    </ul>
  );
};

export default CardSection;
