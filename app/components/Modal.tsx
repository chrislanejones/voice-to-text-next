import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, content }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Capped to the viewport; the text scrolls inside so the close and
          copy buttons stay on screen for long transcripts. The close
          button comes from DialogContent. */}
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col rounded-2xl border-border bg-card text-card-foreground sm:rounded-2xl"
      >
        <DialogHeader className="pr-10">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div
          role="region"
          aria-label="Full text"
          tabIndex={0}
          className="-mx-2 min-h-0 overflow-y-auto rounded-md px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p className="whitespace-pre-wrap text-base leading-relaxed">
            {content}
          </p>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={handleCopy}>
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
