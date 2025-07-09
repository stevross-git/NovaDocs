// frontend/src/components/editor/CollaborativeEditor.tsx
import React, { useEffect, useState, useCallback } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import { HocuspocusProvider } from '@hocuspocus/provider'
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { DatabaseView } from './extensions/DatabaseView'
import { SlashCommand } from './extensions/SlashCommand'
import { EditorToolbar } from './EditorToolbar'
import { EditorBubbleMenu } from './EditorBubbleMenu'
import { CollaborationCursors } from './CollaborationCursors'

interface CollaborativeEditorProps {
  pageId: string
  initialContent?: string
  onUpdate?: (content: string) => void
  className?: string
  editable?: boolean
}

export function CollaborativeEditor({
  pageId,
  initialContent = '',
  onUpdate,
  className,
  editable = true
}: CollaborativeEditorProps) {
  const { user } = useAuth()
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null)
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [collaborators, setCollaborators] = useState<Array<{ id: string; name: string; color: string }>>([])

  // Initialize Yjs document and provider
  useEffect(() => {
    const doc = new Y.Doc()
    setYdoc(doc)

    // IndexedDB persistence for offline support
    const indexeddbProvider = new IndexeddbPersistence(`novadocs-${pageId}`, doc)
    
    // WebSocket provider for real-time collaboration
    const websocketProvider = new HocuspocusProvider({
      url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000',
      name: `page-${pageId}`,
      document: doc,
      token: user?.token || '',
      onConnect: () => {
        console.log('Connected to collaboration server')
        setIsOnline(true)
      },
      onDisconnect: () => {
        console.log('Disconnected from collaboration server')
        setIsOnline(false)
      },
      onAwarenessChange: ({ states }) => {
        const users = Array.from(states.values())
          .filter((state: any) => state.user)
          .map((state: any) => ({
            id: state.user.id,
            name: state.user.name,
            color: state.user.color
          }))
        setCollaborators(users)
      }
    })

    setProvider(websocketProvider)

    return () => {
      indexeddbProvider.destroy()
      websocketProvider.destroy()
      doc.destroy()
    }
  }, [pageId, user])

  // Initialize editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // Disable history since we're using Yjs
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider: provider,
        user: user ? {
          name: user.name,
          color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        } : undefined,
      }),
      DatabaseView,
      SlashCommand,
    ],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML()
      onUpdate?.(content)
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
          'min-h-[500px] px-4 py-2',
          className
        ),
      },
    },
  }, [ydoc, provider, user, editable])

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!editor) return

    // Slash command
    if (event.key === '/' && editor.isActive('paragraph') && editor.isEmpty) {
      event.preventDefault()
      // Trigger slash command menu
      editor.commands.insertContent('/')
    }

    // Save shortcut
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault()
      // Trigger save
      onUpdate?.(editor.getHTML())
    }
  }, [editor, onUpdate])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Connection status */}
      <div className="absolute top-2 right-2 z-10">
        <div className={cn(
          'flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium',
          isOnline 
            ? 'bg-green-100 text-green-800' 
            : 'bg-orange-100 text-orange-800'
        )}>
          <div className={cn(
            'w-2 h-2 rounded-full',
            isOnline ? 'bg-green-500' : 'bg-orange-500'
          )} />
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      {/* Collaborators */}
      <CollaborationCursors collaborators={collaborators} />

      {/* Editor toolbar */}
      {editable && <EditorToolbar editor={editor} />}

      {/* Editor content */}
      <div className="relative">
        <EditorContent editor={editor} />
        {editable && <EditorBubbleMenu editor={editor} />}
      </div>
    </div>
  )
}

// frontend/src/components/editor/EditorToolbar.tsx
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
  Link,
  Image,
  Table,
  Undo,
  Redo,
} from 'lucide-react'

interface EditorToolbarProps {
  editor: Editor
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null

  return (
    <div className="flex items-center gap-1 p-2 border-b bg-gray-50 rounded-t-lg">
      {/* History */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
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
        className="data-[active=true]:bg-blue-100"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        data-active={editor.isActive('italic')}
        className="data-[active=true]:bg-blue-100"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        data-active={editor.isActive('strike')}
        className="data-[active=true]:bg-blue-100"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleCode().run()}
        data-active={editor.isActive('code')}
        className="data-[active=true]:bg-blue-100"
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
        className="data-[active=true]:bg-blue-100"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        data-active={editor.isActive('heading', { level: 2 })}
        className="data-[active=true]:bg-blue-100"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        data-active={editor.isActive('heading', { level: 3 })}
        className="data-[active=true]:bg-blue-100"
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
        className="data-[active=true]:bg-blue-100"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        data-active={editor.isActive('orderedList')}
        className="data-[active=true]:bg-blue-100"
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
        className="data-[active=true]:bg-blue-100"
      >
        <Quote className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          // Trigger database creation
          editor.chain().focus().setDatabaseView({ 
            databaseId: 'new',
            viewType: 'table' 
          }).run()
        }}
      >
        <Table className="h-4 w-4" />
      </Button>
    </div>
  )
}

// frontend/src/components/editor/EditorBubbleMenu.tsx
import React from 'react'
import { BubbleMenu, Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Bold, Italic, Link, Code } from 'lucide-react'

interface EditorBubbleMenuProps {
  editor: Editor
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  if (!editor) return null

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100 }}
      className="bg-white border border-gray-200 rounded-lg shadow-lg p-1 flex items-center gap-1"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        data-active={editor.isActive('bold')}
        className="data-[active=true]:bg-blue-100"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        data-active={editor.isActive('italic')}
        className="data-[active=true]:bg-blue-100"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleCode().run()}
        data-active={editor.isActive('code')}
        className="data-[active=true]:bg-blue-100"
      >
        <Code className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const url = window.prompt('Enter URL:')
          if (url) {
            editor.chain().focus().setLink({ href: url }).run()
          }
        }}
        data-active={editor.isActive('link')}
        className="data-[active=true]:bg-blue-100"
      >
        <Link className="h-4 w-4" />
      </Button>
    </BubbleMenu>
  )
}

// frontend/src/components/editor/CollaborationCursors.tsx
import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Collaborator {
  id: string
  name: string
  color: string
}

interface CollaborationCursorsProps {
  collaborators: Collaborator[]
}

export function CollaborationCursors({ collaborators }: CollaborationCursorsProps) {
  if (collaborators.length === 0) return null

  return (
    <div className="absolute top-2 left-2 z-10">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600">
          {collaborators.length} collaborator{collaborators.length !== 1 ? 's' : ''}
        </span>
        <div className="flex -space-x-2">
          {collaborators.slice(0, 3).map((collaborator) => (
            <Avatar
              key={collaborator.id}
              className="w-6 h-6 border-2 border-white"
              style={{ borderColor: collaborator.color }}
            >
              <AvatarFallback className="text-xs">
                {collaborator.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {collaborators.length > 3 && (
            <div className="w-6 h-6 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center">
              <span className="text-xs text-gray-600">+{collaborators.length - 3}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}