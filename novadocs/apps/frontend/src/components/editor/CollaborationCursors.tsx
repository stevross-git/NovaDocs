// apps/frontend/src/components/editor/CollaborationCursors.tsx
import React from 'react'
import { cn } from '@/lib/utils'

interface CollaborationUser {
  id: string
  name: string
  color: string
  cursor_position?: number
  selection?: any
}

interface CollaborationCursorsProps {
  collaborators: CollaborationUser[]
}

export function CollaborationCursors({ collaborators }: CollaborationCursorsProps) {
  if (collaborators.length === 0) return null

  return (
    <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
      {collaborators.map((collaborator) => (
        <div
          key={collaborator.id}
          className="flex items-center gap-1 bg-white border border-gray-200 rounded-full pl-1 pr-2 py-1 text-xs shadow-sm"
        >
          <div
            className="w-3 h-3 rounded-full border border-white"
            style={{ backgroundColor: collaborator.color }}
          />
          <span className="text-gray-700 font-medium max-w-20 truncate">
            {collaborator.name}
          </span>
        </div>
      ))}
    </div>
  )
}