'use client'

import React, { memo } from 'react'

interface EmptyTableStateProps {
  tableName?: string // Made optional since we don't use it anymore
}

function EmptyTableStateComponent({ tableName }: EmptyTableStateProps) {
  return (
    <div className="flex items-center justify-center py-12">
      <pre className="text-gray-400 text-base font-mono select-none pointer-events-none leading-relaxed">
{`+------------------------------+
|                              |
|          NO DATA             |
|                              |
+------------------------------+`}
      </pre>
    </div>
  )
}

export const EmptyTableState = memo(EmptyTableStateComponent)
