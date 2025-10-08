'use client'

import { useEffect, useRef } from 'react'
import { ExternalLink } from 'lucide-react'

interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
  onOpenInNewTab: () => void
}

export function ContextMenu({ x, y, onClose, onOpenInNewTab }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px]"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <button
        onClick={onOpenInNewTab}
        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        Open in new tab
      </button>
    </div>
  )
}
