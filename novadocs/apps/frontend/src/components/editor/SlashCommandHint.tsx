// components/editor/SlashCommandHint.tsx
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Hash, X } from 'lucide-react'

export function SlashCommandHint() {
  const [showHint, setShowHint] = useState(false)

  const examples = [
    { command: '/h1', description: 'Large heading' },
    { command: '/list', description: 'Bullet list' },
    { command: '/todo', description: 'Task list' },
    { command: '/quote', description: 'Quote block' },
    { command: '/code', description: 'Code block' },
    { command: '/table', description: 'Insert table' },
    { command: '/image', description: 'Add image' },
    { command: '/tip', description: 'Tip callout' },
    { command: '/warning', description: 'Warning callout' },
    { command: '/divider', description: 'Horizontal line' },
  ]

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowHint(true)}
        className="fixed bottom-20 right-4 z-40 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200"
        title="Slash Commands Help"
      >
        <Hash className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Slash Commands</span>
      </Button>

      {showHint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Hash className="h-5 w-5 text-blue-600" />
                Slash Commands
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHint(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="text-sm text-gray-600 mb-4">
              Type <kbd className="px-1 bg-gray-100 rounded font-mono">/</kbd> followed by any of these commands:
            </div>
            
            <div className="space-y-2">
              {examples.map((example, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono font-semibold">
                    {example.command}
                  </kbd>
                  <span className="text-sm text-gray-600">{example.description}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Pro tip:</strong> You can also search! Try typing <kbd className="px-1 bg-blue-100 rounded">/heading</kbd> or <kbd className="px-1 bg-blue-100 rounded">/list</kbd>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-500 text-center">
              Use ↑↓ to navigate, ↵ to select, Esc to close
            </div>
          </div>
        </div>
      )}
    </>
  )
}