// apps/frontend/src/components/editor/CollaborativeEditor.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { DatabaseView } from './extensions/DatabaseView'
import { SlashCommand } from './extensions/SlashCommand'
import { EditorToolbar } from './EditorToolbar'
import { EditorBubbleMenu } from './EditorBubbleMenu'
import { CollaborationCursors } from './CollaborationCursors'
import { toast } from 'sonner'

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

export function CollaborativeEditor({
  pageId,
  initialContent = '',
  onUpdate,
  className,
  editable = true,
  workspace = 'default'
}: CollaborativeEditorProps) {
  const { user } = useAuth()
  const [provider, setProvider] = useState<WebsocketProvider | null>(null)
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isConnected, setIsConnected] = useState(false)
  const [collaborators, setCollaborators] = useState<CollaborationUser[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const retryCountRef = useRef(0)

  // Initialize Yjs document and providers
  useEffect(() => {
    if (!user) return

    const doc = new Y.Doc()
    setYdoc(doc)

    // IndexedDB persistence for offline support
    const indexeddbProvider = new IndexeddbPersistence(`novadocs-${pageId}`, doc)
    
    // WebSocket provider for real-time collaboration
    const websocketProvider = new WebsocketProvider(
      process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',
      `collaboration/${pageId}`,
      doc,
      {
        params: {
          token: user.token
        }
      }
    )

    // Connection event handlers
    websocketProvider.on('status', ({ status }: { status: string }) => {
      setConnectionStatus(status as any)
      setIsConnected(status === 'connected')
      
      if (status === 'connected') {
        setIsOnline(true)
        retryCountRef.current = 0
        toast.success('Connected to collaboration server')
      } else if (status === 'disconnected') {
        setIsOnline(false)
        handleReconnection()
        toast.error('Disconnected from collaboration server')
      }
    })

    websocketProvider.on('connection-error', (error: any) => {
      console.error('WebSocket connection error:', error)
      setIsOnline(false)
      handleReconnection()
      toast.error('Connection error. Trying to reconnect...')
    })

    // Awareness (user presence) handling
    websocketProvider.awareness.on('change', () => {
      const states = Array.from(websocketProvider.awareness.getStates().values())
      const users = states
        .filter((state: any) => state.user && state.user.id !== user.id)
        .map((state: any) => ({
          id: state.user.id,
          name: state.user.name,
          color: state.user.color,
          cursor_position: state.cursor?.position,
          selection: state.cursor?.selection
        }))
      
      setCollaborators(users)
    })

    // Set local user info
    websocketProvider.awareness.setLocalStateField('user', {
      id: user.id,
      name: user.name,
      color: getUserColor(user.id),
    })

    setProvider(websocketProvider)

    // Cleanup function
    return () => {
      clearTimeout(reconnectTimeoutRef.current)
      websocketProvider.destroy()
      indexeddbProvider.destroy()
      doc.destroy()
    }
  }, [pageId, user])

  // Handle reconnection logic
  const handleReconnection = useCallback(() => {
    const maxRetries = 5
    const baseDelay = 1000 // 1 second
    
    if (retryCountRef.current >= maxRetries) {
      toast.error('Maximum reconnection attempts reached')
      return
    }

    const delay = Math.min(baseDelay * Math.pow(2, retryCountRef.current), 30000) // Max 30 seconds
    retryCountRef.current++

    clearTimeout(reconnectTimeoutRef.current)
    reconnectTimeoutRef.current = setTimeout(() => {
      if (provider && !isConnected) {
        toast.info(`Reconnecting... (attempt ${retryCountRef.current}/${maxRetries})`)
        provider.connect()
      }
    }, delay)
  }, [provider, isConnected])

  // Initialize editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // Disable history since we're using Yjs
      }),
      Collaboration.configure({
        document: ydoc,
        field: 'content', // Use 'content' field in Yjs document
      }),
      CollaborationCursor.configure({
        provider: provider,
        user: user ? {
          name: user.name,
          color: getUserColor(user.id),
        } : undefined,
      }),
      DatabaseView.configure({
        workspace,
      }),
      SlashCommand.configure({
        suggestion: {
          items: ({ query }) => getSlashCommandItems(query),
          render: () => ({
            onStart: (props) => {
              // Show slash command menu
            },
            onUpdate: (props) => {
              // Update slash command menu
            },
            onExit: () => {
              // Hide slash command menu
            },
          }),
        },
      }),
    ],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML()
      onUpdate?.(content)
      
      // Update cursor position in awareness
      if (provider) {
        const selection = editor.state.selection
        provider.awareness.setLocalStateField('cursor', {
          position: selection.from,
          selection: {
            from: selection.from,
            to: selection.to
          }
        })
      }
    },
    onSelectionUpdate: ({ editor }) => {
      // Update cursor position for real-time collaboration
      if (provider) {
        const selection = editor.state.selection
        provider.awareness.setLocalStateField('cursor', {
          position: selection.from,
          selection: {
            from: selection.from,
            to: selection.to
          }
        })
      }
    },
  }, [ydoc, provider, user, editable])

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (provider) {
        provider.connect()
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [provider])

  // Periodic ping to keep connection alive
  useEffect(() => {
    if (!provider || !isConnected) return

    const pingInterval = setInterval(() => {
      if (provider.ws?.readyState === WebSocket.OPEN) {
        provider.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // Ping every 30 seconds

    return () => clearInterval(pingInterval)
  }, [provider, isConnected])

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
              : 'Offline'
            }
          </span>
        </div>
      </div>

      {/* Collaboration Cursors */}
      <CollaborationCursors collaborators={collaborators} />

      {/* Editor Toolbar */}
      {editable && (
        <EditorToolbar 
          editor={editor}
          isOnline={isOnline}
          collaborators={collaborators}
        />
      )}

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent 
          editor={editor}
          className={cn(
            'prose prose-sm max-w-none',
            'focus:outline-none',
            !editable && 'pointer-events-none'
          )}
        />
      </div>

      {/* Bubble Menu */}
      {editable && (
        <EditorBubbleMenu 
          editor={editor}
          isOnline={isOnline}
        />
      )}

      {/* Offline Notice */}
      {!isOnline && (
        <div className="absolute bottom-4 left-4 bg-orange-100 text-orange-800 px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full" />
            <span>You're offline. Changes will sync when reconnected.</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper functions
function getUserColor(userId: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ]
  
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

function getSlashCommandItems(query: string) {
  return [
    {
      title: 'Heading 1',
      description: 'Large heading',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run()
      },
    },
    {
      title: 'Heading 2',
      description: 'Medium heading',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run()
      },
    },
    {
      title: 'Bullet List',
      description: 'Create a bulleted list',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run()
      },
    },
    {
      title: 'Database',
      description: 'Create a database view',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertDatabase().run()
      },
    },
  ].filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.description.toLowerCase().includes(query.toLowerCase())
  )
}