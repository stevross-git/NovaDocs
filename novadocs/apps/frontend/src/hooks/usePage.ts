// frontend/src/hooks/usePage.ts
import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWebSocket } from './useWebSocket'
import { graphqlClient } from '@/lib/graphql'
import { Page, UpdatePageInput } from '@/types'

interface UsePageOptions {
  optimistic?: boolean
  autoSave?: boolean
  saveDelay?: number
}

export function usePage(pageId: string, options: UsePageOptions = {}) {
  const {
    optimistic = true,
    autoSave = true,
    saveDelay = 1000
  } = options
  
  const queryClient = useQueryClient()
  const [localChanges, setLocalChanges] = useState<Partial<Page>>({})
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  
  // WebSocket connection for real-time updates
  const { subscribe, unsubscribe, send } = useWebSocket()
  
  // Fetch page data
  const {
    data: page,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['page', pageId],
    queryFn: async () => {
      const response = await graphqlClient.request(`
        query GetPage($id: UUID!) {
          page(id: $id) {
            id
            title
            slug
            workspace { id name }
            parent { id title }
            children { id title position }
            createdBy { id name }
            metadata
            contentYjs
            position
            isTemplate
            blocks {
              id
              type
              data
              properties
              position
              parentBlock { id }
            }
            permissions {
              id
              user { id name }
              permissionType
            }
            createdAt
            updatedAt
          }
        }
      `, { id: pageId })
      
      return response.page
    },
    enabled: !!pageId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  })
  
  // Update page mutation
  const updatePageMutation = useMutation({
    mutationFn: async (input: UpdatePageInput) => {
      const response = await graphqlClient.request(`
        mutation UpdatePage($id: UUID!, $input: UpdatePageInput!) {
          updatePage(id: $id, input: $input) {
            id
            title
            slug
            metadata
            contentYjs
            position
            updatedAt
          }
        }
      `, { id: pageId, input })
      
      return response.updatePage
    },
    onSuccess: (updatedPage) => {
      // Update cache with server response
      queryClient.setQueryData(['page', pageId], (old: Page) => ({
        ...old,
        ...updatedPage
      }))
      
      // Clear local changes that were successfully saved
      setLocalChanges({})
      
      // Broadcast update to other clients
      send('page_updated', {
        pageId,
        updates: updatedPage,
        userId: 'current-user-id' // Replace with actual user ID
      })
    },
    onError: (error) => {
      console.error('Failed to update page:', error)
      // Revert optimistic updates on error
      queryClient.invalidateQueries({ queryKey: ['page', pageId] })
    }
  })
  
  // Optimistic update function
  const updatePage = useCallback((updates: Partial<Page>) => {
    if (optimistic) {
      // Apply optimistic update immediately
      queryClient.setQueryData(['page', pageId], (old: Page) => ({
        ...old,
        ...updates,
        updatedAt: new Date().toISOString()
      }))
      
      // Store local changes for potential rollback
      setLocalChanges(prev => ({ ...prev, ...updates }))
    }
    
    if (autoSave) {
      // Clear previous timeout
      if (saveTimeout) {
        clearTimeout(saveTimeout)
      }
      
      // Set new timeout for auto-save
      const timeout = setTimeout(() => {
        if (isOnline) {
          updatePageMutation.mutate(updates)
        } else {
          // Queue for later when online
          queueOfflineUpdate(updates)
        }
      }, saveDelay)
      
      setSaveTimeout(timeout)
    }
  }, [pageId, optimistic, autoSave, saveDelay, isOnline, saveTimeout, queryClient, updatePageMutation])
  
  // Manual save function
  const savePage = useCallback((updates?: Partial<Page>) => {
    const updatesToSave = updates || localChanges
    if (Object.keys(updatesToSave).length > 0) {
      updatePageMutation.mutate(updatesToSave)
    }
  }, [localChanges, updatePageMutation])
  
  // Offline update queue
  const queueOfflineUpdate = useCallback((updates: Partial<Page>) => {
    const offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]')
    offlineQueue.push({
      type: 'updatePage',
      pageId,
      updates,
      timestamp: Date.now()
    })
    localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue))
  }, [pageId])
  
  // Process offline queue when coming back online
  const processOfflineQueue = useCallback(async () => {
    const offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]')
    const pageUpdates = offlineQueue.filter(item => 
      item.type === 'updatePage' && item.pageId === pageId
    )
    
    for (const update of pageUpdates) {
      try {
        await updatePageMutation.mutateAsync(update.updates)
      } catch (error) {
        console.error('Failed to sync offline update:', error)
      }
    }
    
    // Remove processed updates from queue
    const remainingQueue = offlineQueue.filter(item => 
      !(item.type === 'updatePage' && item.pageId === pageId)
    )
    localStorage.setItem('offlineQueue', JSON.stringify(remainingQueue))
  }, [pageId, updatePageMutation])
  
  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      processOfflineQueue()
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
  }, [processOfflineQueue])
  
  // Subscribe to real-time updates
  useEffect(() => {
    if (pageId) {
      const unsubscribePageUpdates = subscribe('page_updated', (data) => {
        if (data.pageId === pageId) {
          // Apply remote updates
          queryClient.setQueryData(['page', pageId], (old: Page) => ({
            ...old,
            ...data.updates
          }))
        }
      })
      
      return () => {
        unsubscribePageUpdates()
      }
    }
  }, [pageId, subscribe, queryClient])
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout)
      }
    }
  }, [saveTimeout])
  
  // Compute merged page data (server + local changes)
  const mergedPage = page ? { ...page, ...localChanges } : null
  
  return {
    page: mergedPage,
    isLoading,
    error,
    isOnline,
    hasLocalChanges: Object.keys(localChanges).length > 0,
    isSaving: updatePageMutation.isPending,
    updatePage,
    savePage,
    refetch,
    reset: () => {
      setLocalChanges({})
      if (saveTimeout) {
        clearTimeout(saveTimeout)
        setSaveTimeout(null)
      }
    }
  }
}