// components/editor/BasicEditorToolbar.tsx
import React from 'react'
import { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Unlink
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BasicEditorToolbarProps {
  editor: Editor | null
}

export function BasicEditorToolbar({ editor }: BasicEditorToolbarProps) {
  if (!editor) return null

  return (
    <div className="flex items-center gap-1 p-2 border-b bg-gray-50/50 flex-wrap">
      {/* History - only show if available */}
      {editor.can().undo && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
      )}
      {editor.can().redo && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </Button>
      )}

      {(editor.can().undo || editor.can().redo) && (
        <Separator orientation="vertical" className="mx-2 h-6" />
      )}

      {/* Text formatting */}
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
        title="Inline Code"
      >
        <Code className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="mx-2 h-6" />

      {/* Headings */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={cn(
          "hover:bg-gray-100",
          editor.isActive('heading', { level: 1 }) && "bg-blue-100 text-blue-600"
        )}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={cn(
          "hover:bg-gray-100",
          editor.isActive('heading', { level: 2 }) && "bg-blue-100 text-blue-600"
        )}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={cn(
          "hover:bg-gray-100",
          editor.isActive('heading', { level: 3 }) && "bg-blue-100 text-blue-600"
        )}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="mx-2 h-6" />

      {/* Lists */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(
          "hover:bg-gray-100",
          editor.isActive('bulletList') && "bg-blue-100 text-blue-600"
        )}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(
          "hover:bg-gray-100",
          editor.isActive('orderedList') && "bg-blue-100 text-blue-600"
        )}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="mx-2 h-6" />

      {/* Block formatting */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={cn(
          "hover:bg-gray-100",
          editor.isActive('blockquote') && "bg-blue-100 text-blue-600"
        )}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="mx-2 h-6" />

      {/* Link Tools */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const url = window.prompt('Enter URL:')
          if (url) {
            editor.chain().focus().setLink({ href: url }).run()
          }
        }}
        className={cn(
          "hover:bg-gray-100",
          editor.isActive('link') && "bg-blue-100 text-blue-600"
        )}
        title="Add Link"
      >
        <Link className="h-4 w-4" />
      </Button>
      
      {editor.isActive('link') && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().unsetLink().run()}
          title="Remove Link"
        >
          <Unlink className="h-4 w-4" />
        </Button>
      )}

      {/* Text alignment - only show if available */}
      {editor.isActive !== undefined && (
        <>
          <Separator orientation="vertical" className="mx-2 h-6" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={cn(
              "hover:bg-gray-100",
              editor.isActive({ textAlign: 'left' }) && "bg-blue-100 text-blue-600"
            )}
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={cn(
              "hover:bg-gray-100",
              editor.isActive({ textAlign: 'center' }) && "bg-blue-100 text-blue-600"
            )}
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={cn(
              "hover:bg-gray-100",
              editor.isActive({ textAlign: 'right' }) && "bg-blue-100 text-blue-600"
            )}
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  )
}