// apps/frontend/src/components/editor/extensions/DatabaseView.tsx
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import React, { useState, useEffect } from 'react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Table, 
  Plus, 
  Trash2, 
  Edit3, 
  MoreHorizontal,
  Filter,
  Sort,
  Grid,
  Calendar,
  List
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types
interface DatabaseColumn {
  id: string
  name: string
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'url' | 'email' | 'phone'
  options?: string[]
  required?: boolean
}

interface DatabaseRow {
  id: string
  data: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

interface DatabaseViewProps {
  databaseId: string
  viewType: 'table' | 'kanban' | 'calendar' | 'list'
  columns: DatabaseColumn[]
  rows: DatabaseRow[]
  onUpdateDatabase: (data: any) => void
  onDeleteDatabase: () => void
  node: any
  updateAttributes: (attrs: any) => void
  deleteNode: () => void
}

// Database View React Component
const DatabaseViewComponent = ({ 
  databaseId, 
  viewType, 
  columns, 
  rows, 
  onUpdateDatabase,
  onDeleteDatabase,
  node,
  updateAttributes,
  deleteNode 
}: DatabaseViewProps) => {
  const [localColumns, setLocalColumns] = useState<DatabaseColumn[]>(columns || [])
  const [localRows, setLocalRows] = useState<DatabaseRow[]>(rows || [])
  const [isEditing, setIsEditing] = useState(false)
  const [currentView, setCurrentView] = useState<'table' | 'kanban' | 'calendar' | 'list'>(viewType || 'table')
  const [newRowData, setNewRowData] = useState<Record<string, any>>({})

  // Initialize with default columns if empty
  useEffect(() => {
    if (localColumns.length === 0) {
      const defaultColumns: DatabaseColumn[] = [
        { id: 'name', name: 'Name', type: 'text', required: true },
        { id: 'status', name: 'Status', type: 'select', options: ['To Do', 'In Progress', 'Done'] },
        { id: 'priority', name: 'Priority', type: 'select', options: ['Low', 'Medium', 'High'] },
        { id: 'due_date', name: 'Due Date', type: 'date' }
      ]
      setLocalColumns(defaultColumns)
      updateAttributes({ columns: defaultColumns })
    }
  }, [localColumns, updateAttributes])

  // Add new column
  const addColumn = () => {
    const newColumn: DatabaseColumn = {
      id: `col_${Date.now()}`,
      name: 'New Column',
      type: 'text'
    }
    const updatedColumns = [...localColumns, newColumn]
    setLocalColumns(updatedColumns)
    updateAttributes({ columns: updatedColumns })
  }

  // Update column
  const updateColumn = (columnId: string, updates: Partial<DatabaseColumn>) => {
    const updatedColumns = localColumns.map(col => 
      col.id === columnId ? { ...col, ...updates } : col
    )
    setLocalColumns(updatedColumns)
    updateAttributes({ columns: updatedColumns })
  }

  // Delete column
  const deleteColumn = (columnId: string) => {
    const updatedColumns = localColumns.filter(col => col.id !== columnId)
    setLocalColumns(updatedColumns)
    updateAttributes({ columns: updatedColumns })
  }

  // Add new row
  const addRow = () => {
    const newRow: DatabaseRow = {
      id: `row_${Date.now()}`,
      data: newRowData,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    const updatedRows = [...localRows, newRow]
    setLocalRows(updatedRows)
    setNewRowData({})
    updateAttributes({ rows: updatedRows })
  }

  // Update row
  const updateRow = (rowId: string, columnId: string, value: any) => {
    const updatedRows = localRows.map(row =>
      row.id === rowId 
        ? { ...row, data: { ...row.data, [columnId]: value }, updatedAt: new Date() }
        : row
    )
    setLocalRows(updatedRows)
    updateAttributes({ rows: updatedRows })
  }

  // Delete row
  const deleteRow = (rowId: string) => {
    const updatedRows = localRows.filter(row => row.id !== rowId)
    setLocalRows(updatedRows)
    updateAttributes({ rows: updatedRows })
  }

  // Render cell based on column type
  const renderCell = (row: DatabaseRow, column: DatabaseColumn, isEditable: boolean = false) => {
    const value = row.data[column.id]
    const cellId = `cell_${row.id}_${column.id}`

    switch (column.type) {
      case 'text':
        return isEditable ? (
          <Input
            value={value || ''}
            onChange={(e) => updateRow(row.id, column.id, e.target.value)}
            className="border-none shadow-none focus:ring-0 p-1"
            placeholder="Enter text..."
          />
        ) : (
          <span className="px-2 py-1">{value || ''}</span>
        )

      case 'number':
        return isEditable ? (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => updateRow(row.id, column.id, Number(e.target.value))}
            className="border-none shadow-none focus:ring-0 p-1"
            placeholder="0"
          />
        ) : (
          <span className="px-2 py-1">{value || 0}</span>
        )

      case 'select':
        return isEditable ? (
          <Select
            value={value || ''}
            onValueChange={(newValue) => updateRow(row.id, column.id, newValue)}
          >
            <SelectTrigger className="border-none shadow-none focus:ring-0 p-1">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {column.options?.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className={cn(
            "px-2 py-1 rounded text-xs font-medium",
            value === 'To Do' && "bg-gray-100 text-gray-800",
            value === 'In Progress' && "bg-blue-100 text-blue-800",
            value === 'Done' && "bg-green-100 text-green-800",
            value === 'High' && "bg-red-100 text-red-800",
            value === 'Medium' && "bg-yellow-100 text-yellow-800",
            value === 'Low' && "bg-green-100 text-green-800"
          )}>
            {value || ''}
          </span>
        )

      case 'date':
        return isEditable ? (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => updateRow(row.id, column.id, e.target.value)}
            className="border-none shadow-none focus:ring-0 p-1"
          />
        ) : (
          <span className="px-2 py-1">
            {value ? new Date(value).toLocaleDateString() : ''}
          </span>
        )

      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => updateRow(row.id, column.id, e.target.checked)}
            className="m-2"
          />
        )

      default:
        return <span className="px-2 py-1">{value || ''}</span>
    }
  }

  // Render Table View
  const renderTableView = () => (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-50">
            {localColumns.map(column => (
              <th key={column.id} className="border border-gray-200 p-2 text-left">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={column.name}
                      onChange={(e) => updateColumn(column.id, { name: e.target.value })}
                      className="font-medium"
                    />
                    <Select
                      value={column.type}
                      onValueChange={(type) => updateColumn(column.id, { type: type as any })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="select">Select</SelectItem>
                        <SelectItem value="checkbox">Checkbox</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteColumn(column.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{column.name}</span>
                    <span className="text-xs text-gray-500">({column.type})</span>
                  </div>
                )}
              </th>
            ))}
            {isEditing && (
              <th className="border border-gray-200 p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addColumn}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {localRows.map(row => (
            <tr key={row.id} className="hover:bg-gray-50">
              {localColumns.map(column => (
                <td key={column.id} className="border border-gray-200 p-0">
                  {renderCell(row, column, true)}
                </td>
              ))}
              {isEditing && (
                <td className="border border-gray-200 p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteRow(row.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              )}
            </tr>
          ))}
          {/* Add new row */}
          <tr className="bg-gray-50">
            {localColumns.map(column => (
              <td key={column.id} className="border border-gray-200 p-0">
                {renderCell(
                  { id: 'new', data: newRowData, createdAt: new Date(), updatedAt: new Date() },
                  column,
                  true
                )}
              </td>
            ))}
            <td className="border border-gray-200 p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={addRow}
                className="text-green-500 hover:text-green-700"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  // Render Kanban View
  const renderKanbanView = () => {
    const statusColumn = localColumns.find(col => col.name.toLowerCase().includes('status'))
    const statuses = statusColumn?.options || ['To Do', 'In Progress', 'Done']

    return (
      <div className="flex gap-4 overflow-x-auto p-4">
        {statuses.map(status => (
          <div key={status} className="flex-shrink-0 w-72">
            <div className="bg-gray-100 rounded-lg p-4">
              <h3 className="font-medium mb-3">{status}</h3>
              <div className="space-y-2">
                {localRows
                  .filter(row => row.data[statusColumn?.id || 'status'] === status)
                  .map(row => (
                    <div key={row.id} className="bg-white p-3 rounded shadow-sm">
                      <div className="font-medium">{row.data.name || 'Untitled'}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {row.data.due_date && `Due: ${new Date(row.data.due_date).toLocaleDateString()}`}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <NodeViewWrapper className="database-view-wrapper">
      <div className="border border-gray-200 rounded-lg bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Table className="h-5 w-5" />
            <span className="font-medium">Database</span>
          </div>
          <div className="flex items-center gap-2">
            {/* View Type Selector */}
            <div className="flex items-center gap-1 bg-gray-100 rounded p-1">
              <Button
                variant={currentView === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('table')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={currentView === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('kanban')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={currentView === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('calendar')}
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Actions */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className={isEditing ? 'text-blue-500' : ''}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={deleteNode}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="min-h-[200px]">
          {currentView === 'table' && renderTableView()}
          {currentView === 'kanban' && renderKanbanView()}
          {currentView === 'calendar' && (
            <div className="p-8 text-center text-gray-500">
              Calendar view coming soon...
            </div>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  )
}

// TipTap Extension
export const DatabaseView = Node.create({
  name: 'databaseView',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      databaseId: {
        default: null,
      },
      viewType: {
        default: 'table',
      },
      columns: {
        default: [],
      },
      rows: {
        default: [],
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="database-view"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'database-view' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DatabaseViewComponent)
  },

  addCommands() {
    return {
      setDatabaseView: (options) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        })
      },
    }
  },
})

export default DatabaseView