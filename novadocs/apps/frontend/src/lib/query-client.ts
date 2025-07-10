// apps/frontend/src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: how long data is considered fresh
      staleTime: 1000 * 60 * 5, // 5 minutes
      // Cache time: how long unused data stays in cache
      gcTime: 1000 * 60 * 30, // 30 minutes (renamed from cacheTime)
      // Retry configuration
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error && 'status' in error && 
            typeof error.status === 'number' && error.status >= 400 && error.status < 500) {
          return false
        }
        // Retry up to 3 times for other errors
        return failureCount < 3
      },
      // Retry delay with exponential backoff
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
})

// apps/frontend/src/providers/query-provider.tsx
'use client'

import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/query-client'

interface QueryProviderProps {
  children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only show devtools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}

// apps/frontend/src/providers/auth-provider.tsx
'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface User {
  id: string
  name: string
  email: string
  avatar_url?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing token on mount
    const savedToken = localStorage.getItem('auth_token')
    if (savedToken) {
      setToken(savedToken)
      // In a real app, you'd validate the token with the server
      // For now, we'll use mock user data
      setUser({
        id: '1',
        name: 'Demo User',
        email: 'demo@novadocs.com',
        avatar_url: 'https://i.pravatar.cc/100?u=demo'
      })
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    // Mock login - in real app, call your auth API
    const mockToken = 'mock-jwt-token'
    const mockUser = {
      id: '1',
      name: 'Demo User',
      email: email,
      avatar_url: 'https://i.pravatar.cc/100?u=' + email
    }
    
    localStorage.setItem('auth_token', mockToken)
    setToken(mockToken)
    setUser(mockUser)
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// apps/frontend/src/providers/websocket-provider.tsx
'use client'

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'

interface WebSocketEventMap {
  page_updated: { pageId: string; updates: any; userId: string }
  block_updated: { blockId: string; pageId: string; updates: any; userId: string }
  comment_added: { commentId: string; pageId: string; comment: any; userId: string }
  cursor_update: { pageId: string; userId: string; position: number; selection: any }
  page_created: { pageId: string }
  page_deleted: { pageId: string }
}

interface WebSocketContextType {
  isConnected: boolean
  subscribe: <T extends keyof WebSocketEventMap>(
    event: T,
    listener: (data: WebSocketEventMap[T]) => void
  ) => () => void
  send: <T extends keyof WebSocketEventMap>(
    event: T,
    data: WebSocketEventMap[T]
  ) => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const websocketRef = useRef<WebSocket | null>(null)
  const listenersRef = useRef<Map<string, Set<Function>>>(new Map())
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  const connect = () => {
    try {
      const ws = new WebSocket('ws://localhost:8000/ws/collaboration/demo')
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected')
        setIsConnected(true)
        websocketRef.current = ws
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const listeners = listenersRef.current.get(data.type)
          if (listeners) {
            listeners.forEach(listener => listener(data))
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onclose = () => {
        console.log('❌ WebSocket disconnected')
        setIsConnected(false)
        websocketRef.current = null
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, 3000)
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
      }

    } catch (error) {
      console.warn('WebSocket connection failed:', error)
      setIsConnected(false)
    }
  }

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (websocketRef.current) {
        websocketRef.current.close()
      }
    }
  }, [])

  const subscribe = <T extends keyof WebSocketEventMap>(
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
  }

  const send = <T extends keyof WebSocketEventMap>(
    event: T,
    data: WebSocketEventMap[T]
  ) => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({ type: event, ...data }))
    } else {
      console.warn('WebSocket not connected, cannot send message')
    }
  }

  return (
    <WebSocketContext.Provider value={{ isConnected, subscribe, send }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

// apps/frontend/src/providers/index.tsx
'use client'

import React from 'react'
import { QueryProvider } from './query-provider'
import { AuthProvider } from './auth-provider'
import { WebSocketProvider } from './websocket-provider'
import { Toaster } from 'sonner'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider>
        <WebSocketProvider>
          {children}
          <Toaster 
            position="bottom-right"
            expand={false}
            richColors
            closeButton
          />
        </WebSocketProvider>
      </AuthProvider>
    </QueryProvider>
  )
}

// apps/frontend/src/app/layout.tsx - Updated Root Layout
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NovaDocs - Collaborative Wiki Platform',
  description: 'Modern collaborative documentation and knowledge management platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}

// apps/frontend/src/app/page.tsx - Updated to use providers properly
'use client'

import React from 'react'
import { Navigation } from '@/components/layout/Navigation'

export default function RootPage() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Navigation />
      <main className="flex-1 overflow-auto">
        <HomePage />
      </main>
    </div>
  )
}

// Import the HomePage component we created earlier
function HomePage() {
  const { usePages, useUsers } = require('@/hooks/usePage')
  
  // The HomePage component code from earlier artifacts
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to NovaDocs
        </h1>
        <p className="text-gray-600 text-lg">
          Your collaborative knowledge base and documentation platform
        </p>
      </div>
      
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          NovaDocs is Ready!
        </h2>
        <p className="text-gray-600 mb-6">
          Navigate to <strong>/pages</strong> to start creating content
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-lg border">
            <h3 className="font-medium mb-2">Create Pages</h3>
            <p className="text-sm text-gray-600">Rich text editor with real-time collaboration</p>
          </div>
          <div className="p-4 bg-white rounded-lg border">
            <h3 className="font-medium mb-2">Database Collections</h3>
            <p className="text-sm text-gray-600">Build tables and manage data within pages</p>
          </div>
          <div className="p-4 bg-white rounded-lg border">
            <h3 className="font-medium mb-2">File Management</h3>
            <p className="text-sm text-gray-600">Upload files and import documents</p>
          </div>
        </div>
      </div>
    </div>
  )
}