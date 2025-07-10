// apps/frontend/src/hooks/useDatabase.ts
import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

interface Database {
  id: string
  page_id: string
  name: string
  schema: Record<string, any>
  views: Array<{
    id: string
    name: string
    type: 'table' | 'kanban' | 'calendar'
    settings: any
  }>
  created_at: string
  updated_at: string
}

interface DatabaseRow {
  id: string
  database_id: string
  data: Record<string, any>
  position: number
  created_at: string
  updated_at: string
}

interface CreateDatabaseInput {
  page_id: string
  name: string
  schema: Record<string, any>
  views?: Array<{
    id: string
    name: string
    type: string
    settings: any
  }>
}

interface UpdateDatabaseInput {
  name?: string
  schema?: Record<string, any>
  views?: Array<{
    id: string
    name: string
    type: string
    settings: any
  }>
}

interface CreateRowInput {
  data: Record<string, any>
  position?: number
}

interface UpdateRowInput {
  data?: Record<string, any>
  position?: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function useDatabase(databaseId?: string) {
  const queryClient = useQueryClient()

  // Fetch database details
  const {
    data: database,
    isLoading: isDatabaseLoading,
    error: databaseError
  } = useQuery({
    queryKey: ['database', databaseId],
    queryFn: async () => {
      if (!databaseId) return null
      
      const response = await fetch(`${API_BASE}/api/v1/databases/${databaseId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch database: ${response.statusText}`)
      }
      
      return response.json()
    },
    enabled: !!databaseId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Fetch database rows
  const {
    data: rows,
    isLoading: isRowsLoading,
    error: rowsError
  } = useQuery({
    queryKey: ['database-rows', databaseId],
    queryFn: async () => {
      if (!databaseId) return []
      
      const response = await fetch(`${API_BASE}/api/v1/databases/${databaseId}/rows`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch rows: ${response.statusText}`)
      }
      
      return response.json()
    },
    enabled: !!databaseId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  // Create database mutation
  const createDatabaseMutation = useMutation({
    mutationFn: async (input: CreateDatabaseInput): Promise<Database> => {
      const response = await fetch(`${API_BASE}/api/v1/databases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(input)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to create database: ${response.statusText}`)
      }
      
      return response.json()
    },
    onSuccess: (newDatabase) => {
      // Update cache
      queryClient.setQueryData(['database', newDatabase.id], newDatabase)
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['databases'] })
    }
  })

  // Update database mutation
  const updateDatabaseMutation = useMutation({
    mutationFn: async (input: UpdateDatabaseInput): Promise<Database> => {
      if (!databaseId) throw new Error('Database ID required')
      
      const response = await fetch(`${API_BASE}/api/v1/databases/${databaseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(input)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to update database: ${response.statusText}`)
      }
      
      return response.json()
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['database', databaseId] })
      
      const previousDatabase = queryClient.getQueryData(['database', databaseId])
      
      queryClient.setQueryData(['database', databaseId], (old: Database | undefined) => {
        if (!old) return old
        return { ...old, ...newData }
      })
      
      return { previousDatabase }
    },
    onError: (err, newData, context) => {
      if (context?.previousDatabase) {
        queryClient.setQueryData(['database', databaseId], context.previousDatabase)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['database', databaseId] })
    }
  })

  // Create row mutation
  const createRowMutation = useMutation({
    mutationFn: async (input: CreateRowInput): Promise<DatabaseRow> => {
      if (!databaseId) throw new Error('Database ID required')
      
      const response = await fetch(`${API_BASE}/api/v1/databases/${databaseId}/rows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(input)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to create row: ${response.statusText}`)
      }
      
      return response.json()
    },
    onSuccess: (newRow) => {
      // Update rows cache
      queryClient.setQueryData(['database-rows', databaseId], (old: DatabaseRow[] | undefined) => {
        if (!old) return [newRow]
        return [...old, newRow]
      })
    }
  })

  // Update row mutation
  const updateRowMutation = useMutation({
    mutationFn: async ({ rowId, input }: { rowId: string; input: UpdateRowInput }): Promise<DatabaseRow> => {
      const response = await fetch(`${API_BASE}/api/v1/databases/rows/${rowId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(input)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to update row: ${response.statusText}`)
      }
      
      return response.json()
    },
    onMutate: async ({ rowId, input }) => {
      await queryClient.cancelQueries({ queryKey: ['database-rows', databaseId] })
      
      const previousRows = queryClient.getQueryData(['database-rows', databaseId])
      
      queryClient.setQueryData(['database-rows', databaseId], (old: DatabaseRow[] | undefined) => {
        if (!old) return old
        return old.map(row => 
          row.id === rowId ? { ...row, ...input } : row
        )
      })
      
      return { previousRows }
    },
    onError: (err, variables, context) => {
      if (context?.previousRows) {
        queryClient.setQueryData(['database-rows', databaseId], context.previousRows)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['database-rows', databaseId] })
    }
  })

  // Delete row mutation
  const deleteRowMutation = useMutation({
    mutationFn: async (rowId: string): Promise<void> => {
      const response = await fetch(`${API_BASE}/api/v1/databases/rows/${rowId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to delete row: ${response.statusText}`)
      }
    },
    onMutate: async (rowId) => {
      await queryClient.cancelQueries({ queryKey: ['database-rows', databaseId] })
      
      const previousRows = queryClient.getQueryData(['database-rows', databaseId])
      
      queryClient.setQueryData(['database-rows', databaseId], (old: DatabaseRow[] | undefined) => {
        if (!old) return old
        return old.filter(row => row.id !== rowId)
      })
      
      return { previousRows }
    },
    onError: (err, rowId, context) => {
      if (context?.previousRows) {
        queryClient.setQueryData(['database-rows', databaseId], context.previousRows)
      }
    }
  })

  // Convenience functions
  const createDatabase = useCallback(
    (input: CreateDatabaseInput) => createDatabaseMutation.mutateAsync(input),
    [createDatabaseMutation]
  )

  const updateDatabase = useCallback(
    (input: UpdateDatabaseInput) => updateDatabaseMutation.mutateAsync(input),
    [updateDatabaseMutation]
  )

  const createRow = useCallback(
    (input: CreateRowInput) => createRowMutation.mutateAsync(input),
    [createRowMutation]
  )

  const updateRow = useCallback(
    (rowId: string, input: UpdateRowInput) => 
      updateRowMutation.mutateAsync({ rowId, input }),
    [updateRowMutation]
  )

  const deleteRow = useCallback(
    (rowId: string) => deleteRowMutation.mutateAsync(rowId),
    [deleteRowMutation]
  )

  return {
    // Data
    database,
    rows,
    
    // Loading states
    isLoading: isDatabaseLoading || isRowsLoading,
    isDatabaseLoading,
    isRowsLoading,
    
    // Errors
    error: databaseError || rowsError,
    databaseError,
    rowsError,
    
    // Mutations
    createDatabase,
    updateDatabase,
    createRow,
    updateRow,
    deleteRow,
    
    // Mutation states
    isCreatingDatabase: createDatabaseMutation.isPending,
    isUpdatingDatabase: updateDatabaseMutation.isPending,
    isCreatingRow: createRowMutation.isPending,
    isUpdatingRow: updateRowMutation.isPending,
    isDeletingRow: deleteRowMutation.isPending,
  }
}

// Hook for listing all databases in a workspace
export function useDatabases(workspaceId?: string) {
  return useQuery({
    queryKey: ['databases', workspaceId],
    queryFn: async () => {
      const url = workspaceId 
        ? `${API_BASE}/api/v1/databases?workspace_id=${workspaceId}`
        : `${API_BASE}/api/v1/databases`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch databases: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.databases || []
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}