// apps/frontend/src/components/editor/CollaborationCursors.tsx
import React from 'react'
import { cn } from '@/lib/utils'

interface CollaborationUser {
  id: string
  name: string
  color: string
  cursor?: {
    x: number
    y: number
  }
}

interface CollaborationCursorsProps {
  users?: CollaborationUser[]
  className?: string
}

export function CollaborationCursors({ users = [], className }: CollaborationCursorsProps) {
  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {users.map((user) => (
        user.cursor && (
          <div
            key={user.id}
            className="absolute transition-all duration-100 ease-out"
            style={{
              left: user.cursor.x,
              top: user.cursor.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="w-3 h-3 rounded-full border-2 border-white shadow-lg"
              style={{ backgroundColor: user.color }}
            />
            <div
              className="mt-1 px-2 py-1 text-xs text-white rounded shadow-lg whitespace-nowrap"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
          </div>
        )
      ))}
    </div>
  )
}