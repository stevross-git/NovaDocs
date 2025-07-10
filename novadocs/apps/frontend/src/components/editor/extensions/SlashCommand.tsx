// apps/frontend/src/components/editor/extensions/SlashCommand.tsx
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react'
import { cn } from '@/lib/utils'
import { 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Quote, 
  Table, 
  Image, 
  Minus, // Fixed: changed from Divider to Minus
  CheckSquare,
  Calendar,
  Grid,
  Code,
  FileText,
  Hash,
  Type,
  AlignLeft
} from 'lucide-react'

export interface SlashCommandItem {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  command: ({ editor, range }: { editor: any; range: any }) => void
  keywords?: string[]
  category?: string
}

export interface SlashCommandProps {
  items: SlashCommandItem[]
  command: (item: SlashCommandItem) => void
  editor: any
  range: any
}

// Command Items
const getSlashCommandItems = (): SlashCommandItem[] => [
  // Text blocks
  {
    id: 'paragraph',
    title: 'Text',
    description: 'Just start typing with plain text',
    icon: <Type className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run()
    },
    keywords: ['text', 'paragraph', 'p'],
    category: 'basic'
  },
  {
    id: 'heading1',
    title: 'Heading 1',
    description: 'Big section heading',
    icon: <Heading1 className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run()
    },
    keywords: ['heading', 'h1', 'title'],
    category: 'basic'
  },
  {
    id: 'heading2',
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading2 className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run()
    },
    keywords: ['heading', 'h2', 'subtitle'],
    category: 'basic'
  },
  {
    id: 'heading3',
    title: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3 className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run()
    },
    keywords: ['heading', 'h3', 'subheading'],
    category: 'basic'
  },
  
  // Lists
  {
    id: 'bulletlist',
    title: 'Bullet List',
    description: 'Create a simple bullet list',
    icon: <List className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run()
    },
    keywords: ['bullet', 'list', 'ul', 'unordered'],
    category: 'lists'
  },
  {
    id: 'numberedlist',
    title: 'Numbered List',
    description: 'Create a numbered list',
    icon: <ListOrdered className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run()
    },
    keywords: ['numbered', 'list', 'ol', 'ordered'],
    category: 'lists'
  },
  {
    id: 'checklist',
    title: 'To-do List',
    description: 'Track tasks with a to-do list',
    icon: <CheckSquare className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run()
    },
    keywords: ['todo', 'task', 'checklist', 'checkbox'],
    category: 'lists'
  },

  // Content blocks
  {
    id: 'blockquote',
    title: 'Quote',
    description: 'Capture a quote',
    icon: <Quote className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run()
    },
    keywords: ['quote', 'blockquote', 'citation'],
    category: 'blocks'
  },
  {
    id: 'codeblock',
    title: 'Code Block',
    description: 'Create a code block',
    icon: <Code className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
    },
    keywords: ['code', 'codeblock', 'programming'],
    category: 'blocks'
  },
  {
    id: 'divider',
    title: 'Divider',
    description: 'Visually divide blocks',
    icon: <Minus className="h-4 w-4" />, // Fixed: changed from Divider to Minus
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run()
    },
    keywords: ['divider', 'separator', 'hr', 'horizontal'],
    category: 'blocks'
  },

  // Advanced blocks
  {
    id: 'table',
    title: 'Table',
    description: 'Create a simple table',
    icon: <Table className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    },
    keywords: ['table', 'grid', 'data'],
    category: 'advanced'
  },
  {
    id: 'image',
    title: 'Image',
    description: 'Upload or embed an image',
    icon: <Image className="h-4 w-4" />,
    command: ({ editor, range }) => {
      const url = window.prompt('Image URL')
      if (url) {
        editor.chain().focus().deleteRange(range).setImage({ src: url }).run()
      }
    },
    keywords: ['image', 'photo', 'picture', 'media'],
    category: 'media'
  }
]

// Slash Command Menu Component
const SlashCommandMenu = forwardRef<any, SlashCommandProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [query, setQuery] = useState('')

  const filteredItems = props.items.filter(item => {
    const searchText = query.toLowerCase()
    return (
      item.title.toLowerCase().includes(searchText) ||
      item.description.toLowerCase().includes(searchText) ||
      item.keywords?.some(keyword => keyword.includes(searchText))
    )
  })

  const selectItem = React.useCallback((index: number) => {
    const item = filteredItems[index]
    if (item) {
      props.command(item)
    }
  }, [filteredItems, props])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % filteredItems.length)
        return true
      }

      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + filteredItems.length - 1) % filteredItems.length)
        return true
      }

      if (event.key === 'Enter') {
        selectItem(selectedIndex)
        return true
      }

      return false
    },
  }))

  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredItems])

  // Group items by category
  const groupedItems = filteredItems.reduce((groups, item) => {
    const category = item.category || 'other'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(item)
    return groups
  }, {} as Record<string, SlashCommandItem[]>)

  const categoryOrder = ['basic', 'lists', 'blocks', 'advanced', 'media', 'other']
  const orderedCategories = categoryOrder.filter(cat => groupedItems[cat])

  return (
    <div className="z-50 w-72 bg-white rounded-lg border border-gray-200 shadow-lg max-h-80 overflow-y-auto">
      <div className="p-2 border-b border-gray-100">
        <div className="text-xs text-gray-500 font-medium">Type to search...</div>
      </div>

      <div className="p-1">
        {orderedCategories.map((category) => (
          <div key={category} className="mb-2 last:mb-0">
            <div className="px-2 py-1 text-xs font-medium text-gray-400 uppercase tracking-wide">
              {category}
            </div>
            {groupedItems[category].map((item, index) => {
              const globalIndex = filteredItems.indexOf(item)
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded cursor-pointer transition-colors',
                    globalIndex === selectedIndex
                      ? 'bg-blue-50 border-blue-200'
                      : 'hover:bg-gray-50'
                  )}
                  onClick={() => props.command(item)}
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm">
                      {item.title}
                    </div>
                    <div className="text-gray-500 text-xs truncate">
                      {item.description}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <div className="text-sm">No results found</div>
          <div className="text-xs mt-1">Try a different search term</div>
        </div>
      )}
    </div>
  )
})

SlashCommandMenu.displayName = 'SlashCommandMenu'

// Slash Command Extension - ONLY export as default
const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: true,
        command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
          props.command({ editor, range })
        },
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('slashCommand'),
        props: {
          handleKeyDown(view, event) {
            const { state } = view
            const { selection } = state
            const { empty, $from } = selection

            // Only trigger on '/' at start of line or after whitespace
            if (
              event.key === '/' &&
              empty &&
              ($from.parentOffset === 0 || 
               /\s/.test(state.doc.textBetween($from.pos - 1, $from.pos)))
            ) {
              // Let the '/' character be inserted first
              setTimeout(() => {
                showSuggestions(view)
              }, 0)
            }

            return false
          },
        },
      }),
    ]
  },
})

// Show suggestions function
let component: ReactRenderer | null = null
let popup: any = null

function showSuggestions(view: any) {
  const { state } = view
  const { selection } = state
  const { $from } = selection

  // Find the position of the '/' character
  const slashPos = $from.pos - 1
  const range = { from: slashPos, to: $from.pos }

  // Get query (text after '/')
  const query = state.doc.textBetween(slashPos + 1, $from.pos)

  if (component) {
    component.updateProps({ query })
    return
  }

  component = new ReactRenderer(SlashCommandMenu, {
    props: {
      items: getSlashCommandItems(),
      command: (item: SlashCommandItem) => {
        const { tr } = view.state
        const { from, to } = range
        
        // Delete the '/' and any query text
        tr.delete(from, view.state.selection.to)
        view.dispatch(tr)
        
        // Execute the command
        item.command({ editor: view.state.editor, range: { from, to } })
        
        // Hide suggestions
        hideSuggestions()
      },
      editor: view.state.editor,
      range,
      query
    },
    element: document.body,
  })

  if (!popup) {
    popup = tippy(view.dom, {
      getReferenceClientRect: () => {
        const { ranges } = view.state.selection
        const from = Math.min(...ranges.map(range => range.$from.pos))
        const to = Math.max(...ranges.map(range => range.$to.pos))
        
        return view.coordsAtPos(from)
      },
      appendTo: () => document.body,
      content: component.element,
      showOnCreate: true,
      interactive: true,
      trigger: 'manual',
      placement: 'bottom-start',
    })
  }
}

function hideSuggestions() {
  if (popup) {
    popup.destroy()
    popup = null
  }

  if (component) {
    component.destroy()
    component = null
  }
}

// Export only as default to avoid conflicts
export default SlashCommand