import React from "react";
import { Trash2, Maximize2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardFooter } from "./ui/card";

export interface SidebarProps {
  history: string[];
  onDeleteHistory: (index: number) => void;
  onOpenModal: (text: string) => void;
}

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

const SidebarItem: React.FC<{
  text: string;
  onDelete: () => void;
  onOpen: () => void;
  color: (typeof colorKeys)[number];
}> = ({ text, onDelete, onOpen, color }) => (
  <Card
    className="w-full mb-2 hover:ring-1 hover:ring-gray-600 transition-all cursor-pointer flex flex-col min-h-[80px]"
    color={color}
  >
    <CardHeader>
      <CardTitle>{text}</CardTitle>
    </CardHeader>
    <CardFooter>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-1 hover:bg-gray-700/50 rounded ml-auto"
        aria-label="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        className="p-1 hover:bg-gray-700/50 rounded"
        aria-label="Open in modal"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
    </CardFooter>
  </Card>
);

const Sidebar: React.FC<SidebarProps> = ({
  history,
  onDeleteHistory,
  onOpenModal,
}) => {
  return (
    <div className="w-64 p-4 h-full overflow-y-auto bg-gray-900">
      {history.map((text, index) => (
        <SidebarItem
          key={index}
          text={text}
          onDelete={() => onDeleteHistory(index)}
          onOpen={() => onOpenModal(text)}
          color={colorKeys[index % colorKeys.length]}
        />
      ))}
    </div>
  );
};

export default Sidebar;
