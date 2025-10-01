'use client'

import React, { memo } from 'react'

interface EmptyTableStateProps {
  tableName: string
}

function EmptyTableStateComponent({ tableName }: EmptyTableStateProps) {
  // Center the table name within 30 characters (full width without bars)
  const centeredName = tableName.padStart(Math.floor((30 + tableName.length) / 2)).padEnd(30)

  return (
    <div className="flex items-center justify-center py-12">
      <pre className="text-gray-400 text-base font-mono select-none pointer-events-none leading-relaxed">
{`+------------------------------+
|                              |
|          NO DATA             |
|                              |
${centeredName}
|                              |
+------------------------------+`}
      </pre>
    </div>
  )
}

export const EmptyTableState = memo(EmptyTableStateComponent)
