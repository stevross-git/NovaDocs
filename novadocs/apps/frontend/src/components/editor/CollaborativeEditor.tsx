// apps/frontend/src/components/editor/CollaborativeEditor.tsx
'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import CharacterCount from '@tiptap/extension-character-count'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Image from '@tiptap/extension-image'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Link from '@tiptap/extension-link'
import { SlashCommandPlugin } from './extensions/SlashCommandPlugin'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

// Import the basic toolbar, keyboard shortcuts, bubble menu, document actions, slash hint, and link editor
import { BasicEditorToolbar } from './BasicEditorToolbar'
import { KeyboardShortcuts } from './KeyboardShortcuts'
import { SimpleBubbleMenu } from './SimpleBubbleMenu'
import { DocumentActions } from './DocumentActions'
import { SlashCommandHint } from './SlashCommandHint'
import { LinkEditorBubble } from './LinkEditorBubble'

// Dynamically import collaboration extensions to avoid SSR issues
const Collaboration = dynamic(() => import('@tiptap/extension-collaboration'), { ssr: false })
const CollaborationCursor = dynamic(() => import('@tiptap/extension-collaboration-cursor'), { ssr: false })

// Mock toast for now
const toast = {
  success: (message: string) => console.log('Success:', message),
  error: (message: string) => console.log('Error:', message),
  info: (message: string) => console.log('Info:', message)
}

interface CollaborativeEditorProps {
  pageId: string
  initialContent?: string
  onUpdate?: (content: string) => void
  className?: string
  editable?: boolean
  workspace?: string
}

interface CollaborationUser {
  id: string
  name: string
  color: string
  cursor_position?: number
  selection?: any
}

// Helper function to generate consistent user colors
const getUserColor = (userId: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ]
  const hash = userId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
    return a & a
  }, 0)
  return colors[Math.abs(hash) % colors.length]
}

// Mock EditorBubbleMenu component
const EditorBubbleMenu = ({ editor, isOnline }: { editor: Editor | null, isOnline: boolean }) => (
  <div className="hidden">Mock BubbleMenu</div>
)

// Mock CollaborationCursors component
const CollaborationCursors = ({ users }: { users: CollaborationUser[] }) => (
  <div className="absolute inset-0 pointer-events-none">
    {users.map((user) => (
      <div key={user.id} className="text-xs text-gray-500">
        {user.name} is here
      </div>
    ))}
  </div>
)

function CollaborativeEditorComponent({
  pageId,
  initialContent = '',
  onUpdate,
  className,
  editable = true,
  workspace = 'default'
}: CollaborativeEditorProps) {
  const { user } = useAuth()
  const [isOnline, setIsOnline] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [collaborators, setCollaborators] = useState<CollaborationUser[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [isClient, setIsClient] = useState(false)
  const [saveHandler, setSaveHandler] = useState<(() => void) | null>(null)

  // Set client-side flag
  useEffect(() => {
    setIsClient(true)
    if (typeof window !== 'undefined' && navigator) {
      setIsOnline(navigator.onLine)
    }
  }, [])

  // Initialize collaboration when client-side
  useEffect(() => {
    if (!isClient || !user) return

    // Dynamic import of Y.js to avoid SSR issues
    Promise.all([
      import('yjs'),
      import('y-websocket'),
      import('y-indexeddb')
    ]).then(([Y, { WebsocketProvider }, { IndexeddbPersistence }]) => {
      const doc = new Y.Doc()

      // IndexedDB persistence for offline support
      const indexeddbProvider = new IndexeddbPersistence(`novadocs-${pageId}`, doc)
      
      // Mock WebSocket provider for now (replace with real implementation)
      console.log('Would initialize WebSocket provider for:', pageId)
      
      setIsConnected(true)
      setConnectionStatus('connected')
    }).catch(error => {
      console.error('Failed to initialize collaboration:', error)
    })
  }, [isClient, user, pageId])

  // Initialize editor
  const editor = useEditor({
    immediatelyRender: false, // Fix for SSR
    extensions: [
      StarterKit.configure({
        // Re-enable history for undo/redo functionality
        history: {
          depth: 100,
          newGroupDelay: 500,
        },
        // Disable some StarterKit extensions that we'll replace
        table: false,
        taskList: false,
        horizontalRule: false,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      CharacterCount.configure({
        limit: 10000, // Optional character limit
      }),
      // Table support
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      // Task lists
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      // Enhanced Link support
      Link.configure({
        openOnClick: false, // We'll handle clicks with our bubble menu
        linkOnPaste: true,
        autolink: true,
        HTMLAttributes: {
          class: 'link-enhanced text-blue-600 underline hover:text-blue-800 transition-colors',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      // Media
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      HorizontalRule.configure({
        HTMLAttributes: {
          class: 'my-4 border-gray-300',
        },
      }),
      // Slash Commands
      SlashCommandPlugin,
      // Collaboration extensions will be added once they're properly imported
    ],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML()
      onUpdate?.(content)
    },
  }, [editable, initialContent])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isClient) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (saveHandler) {
          saveHandler()
        }
      }
      
      // Ctrl+K or Cmd+K to add/edit link
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        if (editor) {
          const url = window.prompt('Enter URL:')
          if (url) {
            editor.chain().focus().setLink({ href: url }).run()
          }
        }
      }
      
      // Ctrl+Shift+K or Cmd+Shift+K to remove link
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
        e.preventDefault()
        if (editor) {
          editor.chain().focus().unsetLink().run()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isClient, saveHandler])

  // Handle online/offline status safely
  useEffect(() => {
    if (!isClient) return

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [isClient])

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-500 mb-4">Please log in to use the editor</div>
          <button
            onClick={() => window.location.href = '/api/auth/google'}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Login with Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative w-full h-full', className)}>
      {/* Connection Status */}
      <div className="absolute top-4 right-4 z-10">
        <div className={cn(
          'flex items-center gap-2 px-3 py-1 rounded-full text-sm',
          connectionStatus === 'connected' 
            ? 'bg-green-100 text-green-800' 
            : connectionStatus === 'connecting'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        )}>
          <div className={cn(
            'w-2 h-2 rounded-full',
            connectionStatus === 'connected' 
              ? 'bg-green-500' 
              : connectionStatus === 'connecting'
              ? 'bg-yellow-500 animate-pulse'
              : 'bg-red-500'
          )} />
          <span>
            {connectionStatus === 'connected' 
              ? `Online${collaborators.length > 0 ? ` • ${collaborators.length} user${collaborators.length > 1 ? 's' : ''}` : ''}`
              : connectionStatus === 'connecting'
              ? 'Connecting...'
              : 'Offline'}
          </span>
        </div>
      </div>

      {/* Document Actions */}
      {editor && (
        <DocumentActions 
          editor={editor} 
          pageId={pageId}
          title="NovaDocs Document" // Could be dynamic based on first heading
          userId={user?.id || 'anonymous'}
          onSave={async (content) => {
            console.log('Custom save handler called')
            onUpdate?.(content)
          }}
        />
      )}

      {/* Basic Toolbar */}
      {editor && <BasicEditorToolbar editor={editor} />}

      {/* Editor Content */}
      <div className="relative flex-1 overflow-hidden">
        {editor && (
          <>
            <SimpleBubbleMenu editor={editor} />
            <LinkEditorBubble editor={editor} />
            <EditorContent 
              editor={editor}
              className="prose prose-gray max-w-none p-8 focus:outline-none min-h-[500px] 
                         prose-headings:text-gray-900 prose-headings:font-semibold
                         prose-p:text-gray-700 prose-p:leading-relaxed
                         prose-li:text-gray-700
                         prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:py-1
                         prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded prose-code:text-pink-600
                         prose-pre:bg-gray-900 prose-pre:text-gray-100
                         prose-strong:text-gray-900 prose-strong:font-semibold
                         prose-table:table-auto prose-table:border-collapse
                         prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:p-2
                         prose-td:border prose-td:border-gray-300 prose-td:p-2
                         prose-hr:border-gray-300 prose-hr:my-8
                         prose-img:rounded-lg prose-img:shadow-md
                         prose-a:text-blue-600 prose-a:no-underline hover:prose-a:text-blue-800
                         [&_.ProseMirror]:focus:outline-none
                         [&_.ProseMirror]:min-h-[400px]
                         [&_.ProseMirror_ul[data-type='taskList']]:list-none
                         [&_.ProseMirror_ul[data-type='taskList']_li]:flex
                         [&_.ProseMirror_ul[data-type='taskList']_li]:items-start
                         [&_.ProseMirror_ul[data-type='taskList']_li]:gap-2
                         [&_.ProseMirror_ul[data-type='taskList']_li>label]:flex-shrink-0
                         [&_.ProseMirror_ul[data-type='taskList']_li>label]:mt-1
                         [&_.ProseMirror_ul[data-type='taskList']_li>div]:flex-1
                         [&_.link-enhanced]:text-blue-600
                         [&_.link-enhanced]:underline
                         [&_.link-enhanced]:decoration-2
                         [&_.link-enhanced]:underline-offset-2
                         [&_.link-enhanced:hover]:text-blue-800
                         [&_.link-enhanced:hover]:decoration-blue-400"
            />
            <CollaborationCursors users={collaborators} />
          </>
        )}
      </div>
      
      {/* Keyboard Shortcuts Helper */}
      <KeyboardShortcuts />
      
      {/* Slash Commands Helper */}
      <SlashCommandHint />
    </div>
  )
}

// Export as dynamic component to prevent SSR issues
export const CollaborativeEditor = dynamic(() => Promise.resolve(CollaborativeEditorComponent), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Loading editor...</div>
    </div>
  )
})