// apps/frontend/src/components/editor/EditorToolbar.tsx
import React from 'react'
import { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
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
  Link,
  Image,
  Table,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Grid,
  Users,
  Wifi,
  WifiOff
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EditorToolbarProps {
  editor: Editor | null
  isOnline?: boolean
  collaborators?: Array<{ id: string; name: string; color: string }>
}

export function EditorToolbar({ editor, isOnline = true, collaborators = [] }: EditorToolbarProps) {
  if (!editor) return null

  const handleImageUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const src = e.target?.result as string
          editor.chain().focus().setImage({ src }).run()
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

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
    <div className="flex items-center gap-1 p-2 border-b bg-gray-50/50 rounded-t-lg flex-wrap">
      {/* Connection Status */}
      <div className="flex items-center gap-2 mr-4">
        {isOnline ? (
          <div className="flex items-center gap-2 text-green-600">
            <Wifi className="h-4 w-4" />
            <span className="text-xs font-medium">Online</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-orange-600">
            <WifiOff className="h-4 w-4" />
            <span className="text-xs font-medium">Offline</span>
          </div>
        )}
        
        {/* Collaborators */}
        {collaborators.length > 0 && (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-gray-400" />
            <div className="flex -space-x-1">
              {collaborators.slice(0, 3).map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white"
                  style={{ backgroundColor: collaborator.color }}
                  title={collaborator.name}
                >
                  {collaborator.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {collaborators.length > 3 && (
                <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-400 flex items-center justify-center text-xs font-medium text-white">
                  +{collaborators.length - 3}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Separator orientation="vertical" className="mx-2 h-6" />

      {/* History */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo"
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo"
      >
        <Redo className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="mx-2 h-6" />

      {/* Text formatting */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        data-active={editor.isActive('bold')}
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
        data-active={editor.isActive('italic')}
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
        data-active={editor.isActive('strike')}
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
        data-active={editor.isActive('code')}
        className={cn(
          "hover:bg-gray-100",
          editor.isActive('code') && "bg-blue-100 text-blue-600"
        )}
        title="Code"
      >
        <Code className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="mx-2 h-6" />

      {/* Headings */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        data-active={editor.isActive('heading', { level: 1 })}
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
        data-active={editor.isActive('heading', { level: 2 })}
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
        data-active={editor.isActive('heading', { level: 3 })}
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
        data-active={editor.isActive('bulletList')}
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
        data-active={editor.isActive('orderedList')}
        className={cn(
          "hover:bg-gray-100",
          editor.isActive('orderedList') && "bg-blue-100 text-blue-600"
        )}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="mx-2 h-6" />

      {/* Blocks */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        data-active={editor.isActive('blockquote')}
        className={cn(
          "hover:bg-gray-100",
          editor.isActive('blockquote') && "bg-blue-100 text-blue-600"
        )}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLinkToggle}
        data-active={editor.isActive('link')}
        className={cn(
          "hover:bg-gray-100",
          editor.isActive('link') && "bg-blue-100 text-blue-600"
        )}
        title="Link"
      >
        <Link className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleImageUpload}
        title="Image"
      >
        <Image className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        title="Table"
      >
        <Table className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          editor.chain().focus().setDatabaseView({ 
            databaseId: `db_${Date.now()}`,
            viewType: 'table' 
          }).run()
        }}
        title="Database"
      >
        <Grid className="h-4 w-4" />
      </Button>
    </div>
  )
}

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