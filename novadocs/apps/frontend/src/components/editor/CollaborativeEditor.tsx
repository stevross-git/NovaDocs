// apps/frontend/src/components/editor/CollaborativeEditor.tsx
'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useEditor, EditorContent } from '@tiptap/react'
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
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { usePage } from '@/hooks/usePage'
import { toast } from 'sonner'

// Import toolbar and menu components
import { EditorToolbar } from './EditorToolbar'
import { SimpleBubbleMenu } from './SimpleBubbleMenu'

interface CollaborativeEditorProps {
  pageId: string
  initialContent?: string
  onUpdate?: (content: string) => void
  className?: string
  editable?: boolean
  workspace?: string
}

export function CollaborativeEditor({ 
  pageId, 
  initialContent = '', 
  onUpdate, 
  className, 
  editable = true,
  workspace 
}: CollaborativeEditorProps) {
  const { user } = useAuth()
  const { page, savePage, isOnline, isSaving, lastSaved } = usePage(pageId)
  
  const [isClient, setIsClient] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const [websocket, setWebsocket] = useState<WebSocket | null>(null)
  
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const lastContentRef = useRef<string>(initialContent)

  // Set client-side flag
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Initialize WebSocket connection for real-time collaboration
  useEffect(() => {
    if (!isClient || !pageId) return

    const connectWebSocket = () => {
      try {
        const wsUrl = `ws://localhost:8000/ws/collaboration/${pageId}`
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          console.log('✅ WebSocket connected')
          setWsConnected(true)
          setWebsocket(ws)
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log('📡 WebSocket message:', data)
            
            if (data.type === 'connected') {
              toast.success('Connected to collaborative session')
            } else if (data.type === 'echo') {
              // Handle echo for basic testing
              console.log('Echo received:', data)
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        ws.onclose = () => {
          console.log('❌ WebSocket disconnected')
          setWsConnected(false)
          setWebsocket(null)
          
          // Attempt to reconnect after 3 seconds
          setTimeout(() => {
            if (isClient && pageId) {
              connectWebSocket()
            }
          }, 3000)
        }

        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          setWsConnected(false)
        }

        return ws
      } catch (error) {
        console.warn('WebSocket not available:', error)
        setWsConnected(false)
        return null
      }
    }

    const ws = connectWebSocket()

    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [isClient, pageId])

  // Initialize editor with content from API
  const editor = useEditor({
    immediatelyRender: false, // Fix for SSR
    extensions: [
      StarterKit.configure({
        history: {
          depth: 100,
          newGroupDelay: 500,
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      CharacterCount.configure({
        limit: 50000, // 50k character limit
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
        linkOnPaste: true,
        autolink: true,
        HTMLAttributes: {
          class: 'link-enhanced text-blue-600 underline hover:text-blue-800 transition-colors',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
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
    ],
    content: page?.content || initialContent,
    editable,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML()
      lastContentRef.current = content
      
      // Call external update handler
      onUpdate?.(content)
      
      // Auto-save with debouncing
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        if (isOnline && content !== page?.content) {
          savePage(content).catch(error => {
            console.error('Auto-save failed:', error)
            toast.error('Failed to save changes')
          })
        }
      }, 2000) // 2 second debounce
      
      // Send to WebSocket if available
      if (websocket && wsConnected) {
        try {
          websocket.send(JSON.stringify({
            type: 'content_update',
            content,
            pageId,
            userId: user?.id,
            timestamp: new Date().toISOString()
          }))
        } catch (error) {
          console.warn('Failed to send WebSocket update:', error)
        }
      }
    },
  })

  // Update editor content when page data changes
  useEffect(() => {
    if (editor && page?.content && page.content !== lastContentRef.current) {
      editor.commands.setContent(page.content)
      lastContentRef.current = page.content
    }
  }, [editor, page?.content])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Show loading state
  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading editor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("w-full max-w-none", className)}>
      {/* Editor Toolbar */}
      {editor && (
        <EditorToolbar 
          editor={editor} 
          isOnline={isOnline}
          collaborators={[]} // No real collaborators yet
        />
      )}
      
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
        <div className="flex items-center gap-4">
          {/* Online/Offline Status */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isOnline ? "bg-green-500" : "bg-red-500"
            )} />
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
          
          {/* WebSocket Status */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              wsConnected ? "bg-blue-500" : "bg-gray-400"
            )} />
            <span>{wsConnected ? 'Connected' : 'Not connected'}</span>
          </div>
          
          {/* Save Status */}
          {isSaving && (
            <div className="flex items-center gap-2">
              <div className="animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full" />
              <span>Saving...</span>
            </div>
          )}
          
          {lastSaved && !isSaving && (
            <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
          )}
        </div>
        
        {/* Character Count */}
        {editor && (
          <div className="text-gray-500">
            {editor.storage.characterCount?.characters() || 0} characters
          </div>
        )}
      </div>

      {/* Editor Content */}
      <div className="relative">
        {editor && (
          <SimpleBubbleMenu editor={editor} />
        )}
        
        <EditorContent 
          editor={editor}
          className={cn(
            "prose prose-lg max-w-none min-h-[400px] p-6 focus:outline-none",
            "prose-headings:text-gray-900 prose-p:text-gray-700",
            "prose-a:text-blue-600 prose-strong:text-gray-900",
            !editable && "cursor-default"
          )}
        />
        
        {!editable && (
          <div className="absolute inset-0 bg-gray-50/50 pointer-events-none" />
        )}
      </div>
      
      {/* Offline Notice */}
      {!isOnline && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You're currently offline. Changes will be saved when you reconnect.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}