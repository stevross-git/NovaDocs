// apps/frontend/src/hooks/usePage.ts
import { useState, useEffect, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { useWebSocket } from './useWebSocket'

interface Page {
  id: string
  title: string
  content: string
  storage_key?: string
  document_url?: string
  created_at: string
  updated_at: string
  version: number
}

interface CreatePageInput {
  title: string
  content?: string
  workspace_id?: string
}

interface UpdatePageInput {
  title?: string
  content?: string
  workspace_id?: string
}

interface UsePageResult {
  page: Page | null
  isLoading: boolean
  error: Error | null
  createPage: (input: CreatePageInput) => Promise<Page>
  updatePage: (input: UpdatePageInput) => Promise<Page>
  deletePage: () => Promise<void>
  savePage: (content: string) => Promise<void>
  isOnline: boolean
  isSaving: boolean
  lastSaved: Date | null
  collaborators: any[]
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function usePage(pageId?: string): UsePageResult {
  const { user } = useAuth()
  const { subscribe, send } = useWebSocket()
  const queryClient = useQueryClient()
  
  const [isOnline, setIsOnline] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [collaborators, setCollaborators] = useState<any[]>([])

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    setIsOnline(navigator.onLine)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Fetch page data from your existing working API
  const {
    data: page,
    isLoading,
    error
  } = useQuery({
    queryKey: ['page', pageId],
    queryFn: async () => {
      if (!pageId) return null
      
      const response = await fetch(`${API_BASE}/api/v1/pages/${pageId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.page
    },
    enabled: !!pageId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 3
  })

  // Create page mutation - uses your existing API
  const createPageMutation = useMutation({
    mutationFn: async (input: CreatePageInput): Promise<Page> => {
      const response = await fetch(`${API_BASE}/api/v1/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: input.title,
          content: input.content || '',
          workspace_id: input.workspace_id || 'default'
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to create page: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.page
    },
    onSuccess: (newPage) => {
      // Update cache
      queryClient.setQueryData(['page', newPage.id], newPage)
      
      // Invalidate pages list
      queryClient.invalidateQueries({ queryKey: ['pages'] })
      
      // Notify via WebSocket if available
      try {
        send('page_created', { pageId: newPage.id })
      } catch (e) {
        console.log('WebSocket not available:', e)
      }
    }
  })

  // Update page mutation - uses your existing API
  const updatePageMutation = useMutation({
    mutationFn: async (input: UpdatePageInput): Promise<Page> => {
      if (!pageId) throw new Error('Page ID required')
      
      const response = await fetch(`${API_BASE}/api/v1/pages/${pageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: input.title || page?.title || 'Untitled',
          content: input.content || page?.content || '',
          workspace_id: input.workspace_id || 'default'
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to update page: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.page
    },
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['page', pageId] })
      
      // Snapshot previous value
      const previousPage = queryClient.getQueryData(['page', pageId])
      
      // Optimistically update
      queryClient.setQueryData(['page', pageId], (old: Page | undefined) => {
        if (!old) return old
        return { ...old, ...newData, updated_at: new Date().toISOString() }
      })
      
      return { previousPage }
    },
    onError: (err, newData, context) => {
      // Rollback on error
      if (context?.previousPage) {
        queryClient.setQueryData(['page', pageId], context.previousPage)
      }
    },
    onSuccess: (updatedPage) => {
      setLastSaved(new Date())
      
      // Notify via WebSocket if available
      try {
        send('page_updated', { 
          pageId: updatedPage.id, 
          updates: updatedPage,
          userId: user?.id 
        })
      } catch (e) {
        console.log('WebSocket not available:', e)
      }
    },
    onSettled: () => {
      setIsSaving(false)
    }
  })

  // Delete page mutation - uses your existing API
  const deletePageMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!pageId) throw new Error('Page ID required')
      
      const response = await fetch(`${API_BASE}/api/v1/pages/${pageId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to delete page: ${response.statusText}`)
      }
    },
    onSuccess: () => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['page', pageId] })
      
      // Invalidate pages list
      queryClient.invalidateQueries({ queryKey: ['pages'] })
      
      // Notify via WebSocket if available
      try {
        send('page_deleted', { pageId })
      } catch (e) {
        console.log('WebSocket not available:', e)
      }
    }
  })

  // Save page content with debouncing
  const savePage = useCallback(async (content: string) => {
    if (!isOnline || isSaving) return
    
    setIsSaving(true)
    
    try {
      await updatePageMutation.mutateAsync({ content })
    } catch (error) {
      console.error('Failed to save page:', error)
      // Could implement offline queue here
    }
  }, [isOnline, isSaving, updatePageMutation])

  // Subscribe to real-time updates if WebSocket is available
  useEffect(() => {
    if (!pageId) return

    try {
      const unsubscribePageUpdated = subscribe('page_updated', (data) => {
        if (data.pageId === pageId && data.userId !== user?.id) {
          // Update cache with remote changes
          queryClient.setQueryData(['page', pageId], (old: Page | undefined) => {
            if (!old) return old
            return { ...old, ...data.updates }
          })
        }
      })

      const unsubscribeCursorUpdate = subscribe('cursor_update', (data) => {
        if (data.pageId === pageId) {
          setCollaborators(prev => {
            const filtered = prev.filter(c => c.userId !== data.userId)
            return [...filtered, {
              userId: data.userId,
              position: data.position,
              selection: data.selection,
              lastSeen: new Date()
            }]
          })
        }
      })

      return () => {
        unsubscribePageUpdated()
        unsubscribeCursorUpdate()
      }
    } catch (e) {
      console.log('WebSocket not available for subscriptions:', e)
    }
  }, [pageId, user?.id, subscribe, queryClient])

  return {
    page: page || null,
    isLoading,
    error: error as Error | null,
    createPage: createPageMutation.mutateAsync,
    updatePage: updatePageMutation.mutateAsync,
    deletePage: deletePageMutation.mutateAsync,
    savePage,
    isOnline,
    isSaving,
    lastSaved,
    collaborators
  }
}

// Hook for listing pages - uses your existing API
export function usePages() {
  return useQuery({
    queryKey: ['pages'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/v1/pages`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch pages: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.pages || []
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// Hook for users - uses your existing API
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/v1/users`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.users || []
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Hook for creating users - uses your existing API
export function useCreateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (userData: { name: string; email: string; role?: string }) => {
      const response = await fetch(`${API_BASE}/api/v1/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to create user: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.user
    },
    onSuccess: () => {
      // Invalidate users list to refetch
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })
}

// Hook for file upload - uses your existing API
export function useUploadFile() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('workspace_id', 'default')
      
      const response = await fetch(`${API_BASE}/api/v1/upload`, {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error(`Failed to upload file: ${response.statusText}`)
      }
      
      return response.json()
    }
  })
}

// Hook for document import - uses your existing API
export function useImportDocument() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch(`${API_BASE}/api/v1/import`, {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error(`Failed to import document: ${response.statusText}`)
      }
      
      return response.json()
    }
  })
}