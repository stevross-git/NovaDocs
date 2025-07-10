// apps/frontend/src/components/editor/extensions/DatabaseView.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import { 
  Table, 
  Plus, 
  MoreHorizontal, 
  Eye, 
  Grid3X3, 
  Calendar,
  Edit,
  Trash2,
  Save,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDatabase } from '@/hooks/useDatabase'
import { toast } from 'sonner'

interface DatabaseViewProps {
  node: any
  updateAttributes: (attributes: any) => void
  deleteNode: () => void
}

interface DatabaseSchema {
  [key: string]: {
    name: string
    type: 'text' | 'number' | 'date' | 'select' | 'checkbox'
    options?: string[]
  }
}

interface DatabaseRow {
  id: string
  data: Record<string, any>
  position: number
}

interface Database {
  id: string
  name: string
  schema: DatabaseSchema
  views: Array<{
    id: string
    name: string
    type: 'table' | 'kanban' | 'calendar'
    settings: any
  }>
}

export function DatabaseView({ node, updateAttributes, deleteNode }: DatabaseViewProps) {
  const { attrs } = node
  const databaseId = attrs.databaseId
  
  const { 
    database, 
    rows, 
    isLoading, 
    createDatabase, 
    updateDatabase,
    createRow, 
    updateRow, 
    deleteRow 
  } = useDatabase(databaseId)
  
  const [currentView, setCurrentView] = useState<'table' | 'kanban' | 'calendar'>('table')
  const [isEditing, setIsEditing] = useState(false)
  const [showAddRow, setShowAddRow] = useState(false)
  const [editingRow, setEditingRow] = useState<string | null>(null)

  // Initialize database if it doesn't exist
  useEffect(() => {
    if (!databaseId && !isLoading) {
      initializeDatabase()
    }
  }, [databaseId, isLoading])

  const initializeDatabase = async () => {
    try {
      const defaultSchema: DatabaseSchema = {
        name: { name: 'Name', type: 'text' },
        status: { 
          name: 'Status', 
          type: 'select', 
          options: ['Not Started', 'In Progress', 'Complete'] 
        },
        date: { name: 'Date', type: 'date' }
      }

      const newDatabase = await createDatabase({
        page_id: attrs.pageId,
        name: attrs.name || 'New Database',
        schema: defaultSchema,
        views: [
          { id: 'table', name: 'Table', type: 'table', settings: {} },
          { id: 'kanban', name: 'Kanban', type: 'kanban', settings: {} },
          { id: 'calendar', name: 'Calendar', type: 'calendar', settings: {} }
        ]
      })

      updateAttributes({ databaseId: newDatabase.id })
    } catch (error) {
      console.error('Failed to initialize database:', error)
      toast.error('Failed to create database')
    }
  }

  const handleAddRow = async (rowData: Record<string, any>) => {
    try {
      await createRow({
        data: rowData,
        position: rows?.length || 0
      })
      setShowAddRow(false)
      toast.success('Row added successfully')
    } catch (error) {
      console.error('Failed to add row:', error)
      toast.error('Failed to add row')
    }
  }

  const handleUpdateRow = async (rowId: string, data: Record<string, any>) => {
    try {
      await updateRow(rowId, { data })
      setEditingRow(null)
      toast.success('Row updated successfully')
    } catch (error) {
      console.error('Failed to update row:', error)
      toast.error('Failed to update row')
    }
  }

  const handleDeleteRow = async (rowId: string) => {
    if (confirm('Are you sure you want to delete this row?')) {
      try {
        await deleteRow(rowId)
        toast.success('Row deleted successfully')
      } catch (error) {
        console.error('Failed to delete row:', error)
        toast.error('Failed to delete row')
      }
    }
  }

  if (isLoading) {
    return (
      <NodeViewWrapper className="database-view">
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </NodeViewWrapper>
    )
  }

  if (!database) {
    return (
      <NodeViewWrapper className="database-view">
        <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Grid3X3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Creating Database...
          </h3>
          <p className="text-gray-600">
            Setting up your new database view
          </p>
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper className="database-view">
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Grid3X3 className="w-5 h-5 text-gray-600" />
              <h3 className="font-medium text-gray-900">
                {database.name}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {rows?.length || 0} rows
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {/* View Switcher */}
              <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
                <button
                  onClick={() => setCurrentView('table')}
                  className={`p-2 text-sm ${
                    currentView === 'table' 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Table className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentView('kanban')}
                  className={`p-2 text-sm border-x border-gray-200 ${
                    currentView === 'kanban' 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentView('calendar')}
                  className={`p-2 text-sm ${
                    currentView === 'calendar' 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </div>

              {/* Actions */}
              <Button size="sm" onClick={() => setShowAddRow(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add Row
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Database
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={deleteNode}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Database
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {currentView === 'table' && (
            <TableView 
              database={database}
              rows={rows || []}
              onUpdateRow={handleUpdateRow}
              onDeleteRow={handleDeleteRow}
              editingRow={editingRow}
              setEditingRow={setEditingRow}
            />
          )}
          
          {currentView === 'kanban' && (
            <KanbanView 
              database={database}
              rows={rows || []}
              onUpdateRow={handleUpdateRow}
            />
          )}
          
          {currentView === 'calendar' && (
            <CalendarView 
              database={database}
              rows={rows || []}
            />
          )}
        </div>
      </div>

      {/* Add Row Dialog */}
      <AddRowDialog
        open={showAddRow}
        onOpenChange={setShowAddRow}
        schema={database.schema}
        onSubmit={handleAddRow}
      />
    </NodeViewWrapper>
  )
}

// Table View Component
function TableView({ 
  database, 
  rows, 
  onUpdateRow, 
  onDeleteRow, 
  editingRow, 
  setEditingRow 
}: {
  database: Database
  rows: DatabaseRow[]
  onUpdateRow: (id: string, data: Record<string, any>) => void
  onDeleteRow: (id: string) => void
  editingRow: string | null
  setEditingRow: (id: string | null) => void
}) {
  const columns = Object.entries(database.schema)

  if (rows.length === 0) {
    return (
      <div className="text-center py-8">
        <Table className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h4 className="text-lg font-medium text-gray-900 mb-2">
          No data yet
        </h4>
        <p className="text-gray-600">
          Add your first row to get started
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map(([key, column]) => (
              <th key={key} className="text-left py-2 px-3 font-medium text-gray-700">
                {column.name}
              </th>
            ))}
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              row={row}
              columns={columns}
              isEditing={editingRow === row.id}
              onEdit={() => setEditingRow(row.id)}
              onSave={(data) => onUpdateRow(row.id, data)}
              onCancel={() => setEditingRow(null)}
              onDelete={() => onDeleteRow(row.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Table Row Component
function TableRow({ 
  row, 
  columns, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel, 
  onDelete 
}: {
  row: DatabaseRow
  columns: Array<[string, any]>
  isEditing: boolean
  onEdit: () => void
  onSave: (data: Record<string, any>) => void
  onCancel: () => void
  onDelete: () => void
}) {
  const [editData, setEditData] = useState(row.data)

  useEffect(() => {
    setEditData(row.data)
  }, [row.data, isEditing])

  const handleSave = () => {
    onSave(editData)
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      {columns.map(([key, column]) => (
        <td key={key} className="py-2 px-3">
          {isEditing ? (
            <CellEditor
              type={column.type}
              value={editData[key] || ''}
              options={column.options}
              onChange={(value) => setEditData(prev => ({ ...prev, [key]: value }))}
            />
          ) : (
            <CellDisplay
              type={column.type}
              value={row.data[key]}
              options={column.options}
            />
          )}
        </td>
      ))}
      <td className="py-2 px-3">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={handleSave}>
              <Save className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </td>
    </tr>
  )
}

// Cell Editor Component
function CellEditor({ 
  type, 
  value, 
  options, 
  onChange 
}: {
  type: string
  value: any
  options?: string[]
  onChange: (value: any) => void
}) {
  switch (type) {
    case 'select':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
        >
          <option value="">Select...</option>
          {options?.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      )
    
    case 'checkbox':
      return (
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded"
        />
      )
    
    case 'date':
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
        />
      )
    
    case 'number':
      return (
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
        />
      )
    
    default:
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
        />
      )
  }
}

// Cell Display Component
function CellDisplay({ type, value, options }: { type: string; value: any; options?: string[] }) {
  if (!value && value !== 0 && value !== false) {
    return <span className="text-gray-400">—</span>
  }

  switch (type) {
    case 'checkbox':
      return (
        <input
          type="checkbox"
          checked={!!value}
          disabled
          className="rounded"
        />
      )
    
    case 'select':
      return (
        <Badge variant="secondary" className="text-xs">
          {value}
        </Badge>
      )
    
    case 'date':
      return new Date(value).toLocaleDateString()
    
    default:
      return String(value)
  }
}

// Placeholder components for other views
function KanbanView({ database, rows }: { database: Database; rows: DatabaseRow[] }) {
  return (
    <div className="text-center py-8">
      <Grid3X3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
      <h4 className="text-lg font-medium text-gray-900 mb-2">
        Kanban View
      </h4>
      <p className="text-gray-600">
        Kanban view coming soon
      </p>
    </div>
  )
}

function CalendarView({ database, rows }: { database: Database; rows: DatabaseRow[] }) {
  return (
    <div className="text-center py-8">
      <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
      <h4 className="text-lg font-medium text-gray-900 mb-2">
        Calendar View
      </h4>
      <p className="text-gray-600">
        Calendar view coming soon
      </p>
    </div>
  )
}

// Add Row Dialog Component
function AddRowDialog({ 
  open, 
  onOpenChange, 
  schema, 
  onSubmit 
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  schema: DatabaseSchema
  onSubmit: (data: Record<string, any>) => void
}) {
  const [data, setData] = useState<Record<string, any>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(data)
    setData({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Row</DialogTitle>
          <DialogDescription>
            Fill in the details for the new row
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {Object.entries(schema).map(([key, column]) => (
            <div key={key} className="space-y-2">
              <label className="text-sm font-medium">{column.name}</label>
              <CellEditor
                type={column.type}
                value={data[key] || ''}
                options={column.options}
                onChange={(value) => setData(prev => ({ ...prev, [key]: value }))}
              />
            </div>
          ))}
          
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Add Row
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}