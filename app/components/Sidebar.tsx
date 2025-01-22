"use client"

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { Modal } from "./Modal"

interface SidebarProps {
  history: string[]
  onDeleteHistory: (index: number) => void
}

export default function Sidebar({ history, onDeleteHistory }: SidebarProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null)

  const handleItemClick = (item: string) => {
    setSelectedItem(item)
  }

  const handleCloseModal = () => {
    setSelectedItem(null)
  }

  return (
    <div className="w-64 bg-gray-900 text-white p-4 border-r border-gray-900">
      <h2 className="text-xl font-semibold mb-4">Dictation History</h2>
      <ScrollArea className="h-[calc(100vh-8rem)]">
        {history.map((item, index) => (
          <div key={index} className="mb-2 p-2 bg-gray-800 rounded flex justify-between items-center">
            <button onClick={() => handleItemClick(item)} className="text-left truncate flex-grow" title={item}>
              {item.length > 30 ? `${item.substring(0, 30)}...` : item}
            </button>
            <Button variant="ghost" size="icon" onClick={() => onDeleteHistory(index)} className="ml-2">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </ScrollArea>
      <Modal
        isOpen={!!selectedItem}
        onClose={handleCloseModal}
        title="Full Transcription"
        content={selectedItem || ""}
      />
    </div>
  )
}

