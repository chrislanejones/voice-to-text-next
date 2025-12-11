import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { X, Copy, Check } from "lucide-react";
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
      <DialogContent className="bg-gray-900 border border-gray-700">
        <div className="absolute right-4 top-4">
          <DialogClose className="rounded-sm opacity-70 ring-offset-gray-900 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-gray-800">
            <X className="h-4 w-4 text-white" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <p className="text-sm text-white">{content}</p>
        </div>
        <DialogFooter>
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-gray-300/50 bg-gray-100/50 rounded ml-auto flex items-center gap-2"
            aria-label="Copy to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                <span className="text-sm">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span className="text-sm">Copy</span>
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
