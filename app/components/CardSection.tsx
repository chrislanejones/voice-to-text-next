import React from "react";
import { Trash2, Maximize2, Copy } from "lucide-react"; // Add Copy import
import { Card, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { motion, AnimatePresence } from "framer-motion";
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

const CardSectionItem: React.FC<{
  text: string;
  onDelete: () => void;
  onOpen: () => void;
  color: (typeof colorKeys)[number];
  index: number;
}> = ({ text, onDelete, onOpen, color }) => {
  const { toast } = useToast();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast({
      description: "Text copied to clipboard",
      duration: 2000,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        duration: 0.2,
        ease: "easeOut",
      }}
      layout
    >
      <Card
        className="w-full mb-2 transition-all cursor-pointer flex flex-col min-h-[80px]"
        color={color}
      >
        <CardHeader>
          <CardTitle>{text}</CardTitle>
        </CardHeader>
        <CardFooter>
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-gray-300/50 bg-gray-100/50 rounded ml-auto"
            aria-label="Copy to clipboard"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 hover:bg-gray-300/50 bg-gray-100/50 rounded"
            aria-label="Delete Card"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="p-1 hover:bg-gray-300/50 bg-gray-100/50 rounded"
            aria-label="Open in modal"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </CardFooter>
      </Card>
    </motion.div>
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
  return (
    <div className="h-full overflow-y-auto w-full max-w-[800px] px-4 sm:px-0">
      <div className="mb-6 sm:mb-8">
        {/* Dictation Section */}
        {/* Your dictation component goes here */}
      </div>
      <AnimatePresence>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 auto-rows-fr">
          {history.map((text, index) => (
            <CardSectionItem
              key={`${text}-${index}`}
              text={text}
              onDelete={() => onDeleteHistory(index)}
              onOpen={() => onOpenModal(text)}
              color={colorKeys[index % colorKeys.length]}
              index={index}
            />
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
};

export default CardSection;
