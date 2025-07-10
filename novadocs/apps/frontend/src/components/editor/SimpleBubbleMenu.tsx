// components/editor/SimpleBubbleMenu.tsx
import React from 'react'
import { BubbleMenu, Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Bold, Italic, Strikethrough, Code } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SimpleBubbleMenuProps {
  editor: Editor | null
}

export function SimpleBubbleMenu({ editor }: SimpleBubbleMenuProps) {
  if (!editor) return null

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ 
        duration: 100,
        placement: 'top'
      }}
      className="flex items-center gap-1 p-1 bg-white border border-gray-200 rounded-lg shadow-lg"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive('bold') && "bg-blue-100 text-blue-600"
        )}
        title="Bold"
      >
        <Bold className="h-3 w-3" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive('italic') && "bg-blue-100 text-blue-600"
        )}
        title="Italic"
      >
        <Italic className="h-3 w-3" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive('strike') && "bg-blue-100 text-blue-600"
        )}
        title="Strikethrough"
      >
        <Strikethrough className="h-3 w-3" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={cn(
          "h-8 w-8 p-0",
          editor.isActive('code') && "bg-blue-100 text-blue-600"
        )}
        title="Code"
      >
        <Code className="h-3 w-3" />
      </Button>
    </BubbleMenu>
  )
}