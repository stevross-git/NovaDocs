// frontend/src/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface WebSocketEventMap {
  page_updated: { pageId: string; updates: any; userId: string }
  block_updated: { blockId: string; pageId: string; updates: any; userId: string }
  comment_added: { commentId: string; pageId: string; comment: any; userId: string }
  cursor_update: { pageId: string; userId: string; position: number; selection: any }
}

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null)
  const listenersRef = useRef<Map<string, Set<Function>>>(new Map())

  useEffect(() => {
    // Initialize socket connection
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000', {
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('auth_token') || ''
      }
    })

    socketRef.current = socket

    // Connection event handlers
    socket.on('connect', () => {
      console.log('WebSocket connected')
    })

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
    })

    socket.on('error', (error) => {
      console.error('WebSocket error:', error)
    })

    // Generic event listener
    socket.onAny((event, data) => {
      const listeners = listenersRef.current.get(event)
      if (listeners) {
        listeners.forEach(listener => listener(data))
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const subscribe = useCallback(<T extends keyof WebSocketEventMap>(
    event: T,
    listener: (data: WebSocketEventMap[T]) => void
  ) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set())
    }
    
    const listeners = listenersRef.current.get(event)!
    listeners.add(listener)

    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) {
        listenersRef.current.delete(event)
      }
    }
  }, [])

  const send = useCallback(<T extends keyof WebSocketEventMap>(
    event: T,
    data: WebSocketEventMap[T]
  ) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, data)
    }
  }, [])

  const unsubscribe = useCallback((event: string, listener: Function) => {
    const listeners = listenersRef.current.get(event)
    if (listeners) {
      listeners.delete(listener)
      if (listeners.size === 0) {
        listenersRef.current.delete(event)
      }
    }
  }, [])

  return { subscribe, unsubscribe, send }
}