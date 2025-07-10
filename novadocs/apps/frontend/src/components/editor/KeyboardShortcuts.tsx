// components/editor/KeyboardShortcuts.tsx
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { HelpCircle, X } from 'lucide-react'

export function KeyboardShortcuts() {
  const [showShortcuts, setShowShortcuts] = useState(false)

  const shortcuts = [
    { keys: '/', action: 'Open Slash Commands' },
    { keys: 'Ctrl + S', action: 'Save Document' },
    { keys: 'Ctrl + K', action: 'Add/Edit Link' },
    { keys: 'Ctrl + Shift + K', action: 'Remove Link' },
    { keys: 'Ctrl + B', action: 'Bold' },
    { keys: 'Ctrl + I', action: 'Italic' },
    { keys: 'Ctrl + U', action: 'Underline' },
    { keys: 'Ctrl + Shift + X', action: 'Strikethrough' },
    { keys: 'Ctrl + `', action: 'Inline Code' },
    { keys: 'Ctrl + Shift + 1', action: 'Heading 1' },
    { keys: 'Ctrl + Shift + 2', action: 'Heading 2' },
    { keys: 'Ctrl + Shift + 3', action: 'Heading 3' },
    { keys: 'Ctrl + Shift + 8', action: 'Bullet List' },
    { keys: 'Ctrl + Shift + 7', action: 'Numbered List' },
    { keys: 'Ctrl + Shift + 9', action: 'Todo List' },
    { keys: 'Ctrl + Shift + .', action: 'Blockquote' },
    { keys: 'Ctrl + Alt + C', action: 'Code Block' },
    { keys: 'Ctrl + Shift + -', action: 'Horizontal Rule' },
    { keys: 'Ctrl + Z', action: 'Undo' },
    { keys: 'Ctrl + Y', action: 'Redo' },
    { keys: 'Ctrl + A', action: 'Select All' },
  ]

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowShortcuts(true)}
        title="Keyboard Shortcuts"
        className="fixed bottom-4 right-4 z-50"
      >
        <HelpCircle className="h-4 w-4" />
      </Button>

      {showShortcuts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShortcuts(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {shortcuts.map((shortcut, index) => (
                <div key={index} className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-600">{shortcut.action}</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                    {shortcut.keys}
                  </kbd>
                </div>
              ))}
            </div>
            
            <div className="mt-4 text-xs text-gray-500">
              Press <kbd className="px-1 bg-gray-100 rounded">Esc</kbd> to close
            </div>
          </div>
        </div>
      )}
    </>
  )
}