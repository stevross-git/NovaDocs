// apps/frontend/src/components/editor/EditorBubbleMenu.tsx
import React from 'react'
import { BubbleMenu, Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Bold, Italic, Link, Code, Strikethrough, Underline } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EditorBubbleMenuProps {
  editor: Editor | null
  isOnline?: boolean
}

export function EditorBubbleMenu({ editor, isOnline = true }: EditorBubbleMenuProps) {
  if (!editor) return null

  const handleLinkToggle = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    if (url === null) return

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ 
        duration: 100,
        placement: 'top',
        theme: 'light-border'
      }}
      className="bg-white border border-gray-200 rounded-lg shadow-lg p-1 flex items-center gap-1"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(
          "hover:bg-gray-100",
          editor.isActive('bold') && "bg-blue-100 text-blue-600"
        )}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(
          "hover:bg-gray-100",
          editor.isActive('italic') && "bg-blue-100 text-blue-600"
        )}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={cn(
          "hover:bg-gray-100",
          editor.isActive('strike') && "bg-blue-100 text-blue-600"
        )}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={cn(
          "hover:bg-gray-100",
          editor.isActive('code') && "bg-blue-100 text-blue-600"
        )}
        title="Code"
      >
        <Code className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="mx-1 h-4" />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLinkToggle}
        className={cn(
          "hover:bg-gray-100",
          editor.isActive('link') && "bg-blue-100 text-blue-600"
        )}
        title="Link"
      >
        <Link className="h-4 w-4" />
      </Button>
    </BubbleMenu>
  )
}

