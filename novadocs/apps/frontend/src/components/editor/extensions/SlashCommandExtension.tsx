// components/editor/extensions/SlashCommandExtension.tsx
import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react'
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
  Minus,
  CheckSquare,
  Code,
  Type,
  Calendar,
  FileText,
  AlignLeft,
  Columns,
  Lightbulb,
  AlertTriangle,
  Info,
  Link,
  ExternalLink,
} from 'lucide-react'

export interface SlashCommandItem {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  command: ({ editor, range, props }: { editor: any; range: any; props?: any }) => void
  keywords?: string[]
  category: string
  searchTerms?: string[]
}

export interface SlashCommandProps {
  items: SlashCommandItem[]
  command: (item: SlashCommandItem) => void
  editor: any
  range: any
  query: string
}

// Define all available slash commands
export const getSlashCommandItems = (): SlashCommandItem[] => [
  // Basic Text
  {
    id: 'paragraph',
    title: 'Text',
    description: 'Just start typing with plain text',
    icon: <Type className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run()
    },
    keywords: ['text', 'paragraph', 'p'],
    category: 'Basic blocks',
    searchTerms: ['text', 'paragraph', 'plain']
  },
  {
    id: 'heading1',
    title: 'Heading 1',
    description: 'Big section heading',
    icon: <Heading1 className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run()
    },
    keywords: ['h1', 'heading', 'title'],
    category: 'Basic blocks',
    searchTerms: ['heading', 'h1', 'title', 'large']
  },
  {
    id: 'heading2',
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading2 className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run()
    },
    keywords: ['h2', 'heading', 'subtitle'],
    category: 'Basic blocks',
    searchTerms: ['heading', 'h2', 'subtitle', 'medium']
  },
  {
    id: 'heading3',
    title: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3 className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run()
    },
    keywords: ['h3', 'heading', 'subheading'],
    category: 'Basic blocks',
    searchTerms: ['heading', 'h3', 'small', 'section']
  },

  // Lists
  {
    id: 'bulletlist',
    title: 'Bullet List',
    description: 'Create a simple bullet list',
    icon: <List className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run()
    },
    keywords: ['bullet', 'list', 'ul'],
    category: 'Lists',
    searchTerms: ['bullet', 'list', 'unordered', 'ul', 'dot']
  },
  {
    id: 'numberedlist',
    title: 'Numbered List',
    description: 'Create a numbered list',
    icon: <ListOrdered className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run()
    },
    keywords: ['numbered', 'list', 'ol'],
    category: 'Lists',
    searchTerms: ['numbered', 'list', 'ordered', 'ol', '123']
  },
  {
    id: 'todolist',
    title: 'To-do List',
    description: 'Track tasks with a to-do list',
    icon: <CheckSquare className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run()
    },
    keywords: ['todo', 'task', 'checklist', 'checkbox'],
    category: 'Lists',
    searchTerms: ['todo', 'task', 'check', 'checkbox', 'list']
  },

  // Content Blocks
  {
    id: 'quote',
    title: 'Quote',
    description: 'Capture a quote or callout',
    icon: <Quote className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run()
    },
    keywords: ['quote', 'blockquote', 'citation'],
    category: 'Content',
    searchTerms: ['quote', 'blockquote', 'citation', 'callout']
  },
  {
    id: 'code',
    title: 'Code Block',
    description: 'Create a code block with syntax highlighting',
    icon: <Code className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
    },
    keywords: ['code', 'codeblock', 'programming', 'syntax'],
    category: 'Content',
    searchTerms: ['code', 'programming', 'syntax', 'block']
  },
  {
    id: 'divider',
    title: 'Divider',
    description: 'Visually divide blocks',
    icon: <Minus className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run()
    },
    keywords: ['divider', 'separator', 'hr', 'line'],
    category: 'Content',
    searchTerms: ['divider', 'separator', 'line', 'hr', 'horizontal']
  },

  // Advanced
  {
    id: 'table',
    title: 'Table',
    description: 'Create a table',
    icon: <Table className="w-4 h-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    },
    keywords: ['table', 'grid', 'data'],
    category: 'Advanced',
    searchTerms: ['table', 'grid', 'data', 'rows', 'columns']
  },

  // Media
  {
    id: 'link',
    title: 'Link',
    description: 'Add a link to text or URL',
    icon: <Link className="w-4 h-4" />,
    command: ({ editor, range }) => {
      const url = window.prompt('Enter URL:')
      if (url) {
        const linkText = window.prompt('Link text (optional):') || url
        editor.chain().focus().deleteRange(range).insertContent(`<a href="${url}" target="_blank">${linkText}</a>`).run()
      }
    },
    keywords: ['link', 'url', 'href', 'anchor'],
    category: 'Media',
    searchTerms: ['link', 'url', 'website', 'href', 'anchor']
  },
  {
    id: 'image',
    title: 'Image',
    description: 'Upload or embed an image',
    icon: <Image className="w-4 h-4" />,
    command: ({ editor, range }) => {
      const url = window.prompt('Enter image URL:')
      if (url) {
        editor.chain().focus().deleteRange(range).setImage({ src: url }).run()
      }
    },
    keywords: ['image', 'photo', 'picture', 'img'],
    category: 'Media',
    searchTerms: ['image', 'photo', 'picture', 'media', 'img']
  },

  // Callouts
  {
    id: 'info-callout',
    title: 'Info Callout',
    description: 'Add an info callout box',
    icon: <Info className="w-4 h-4" />,
    command: ({ editor, range }) => {
      const content = `
        <div style="border-left: 4px solid #3b82f6; background: #eff6ff; padding: 1rem; margin: 1rem 0; border-radius: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span style="color: #3b82f6;">ℹ️</span>
            <strong style="color: #1e40af;">Info</strong>
          </div>
          <p>Add your info message here...</p>
        </div>
      `
      editor.chain().focus().deleteRange(range).insertContent(content).run()
    },
    keywords: ['info', 'callout', 'note', 'information'],
    category: 'Callouts',
    searchTerms: ['info', 'callout', 'note', 'blue', 'information']
  },
  {
    id: 'warning-callout',
    title: 'Warning Callout',
    description: 'Add a warning callout box',
    icon: <AlertTriangle className="w-4 h-4" />,
    command: ({ editor, range }) => {
      const content = `
        <div style="border-left: 4px solid #f59e0b; background: #fffbeb; padding: 1rem; margin: 1rem 0; border-radius: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span style="color: #f59e0b;">⚠️</span>
            <strong style="color: #d97706;">Warning</strong>
          </div>
          <p>Add your warning message here...</p>
        </div>
      `
      editor.chain().focus().deleteRange(range).insertContent(content).run()
    },
    keywords: ['warning', 'callout', 'alert', 'caution'],
    category: 'Callouts',
    searchTerms: ['warning', 'callout', 'alert', 'yellow', 'caution']
  },
  {
    id: 'tip-callout',
    title: 'Tip Callout',
    description: 'Add a tip callout box',
    icon: <Lightbulb className="w-4 h-4" />,
    command: ({ editor, range }) => {
      const content = `
        <div style="border-left: 4px solid #10b981; background: #ecfdf5; padding: 1rem; margin: 1rem 0; border-radius: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span style="color: #10b981;">💡</span>
            <strong style="color: #047857;">Tip</strong>
          </div>
          <p>Add your tip here...</p>
        </div>
      `
      editor.chain().focus().deleteRange(range).insertContent(content).run()
    },
    keywords: ['tip', 'callout', 'hint', 'suggestion'],
    category: 'Callouts',
    searchTerms: ['tip', 'callout', 'hint', 'green', 'suggestion', 'lightbulb']
  }
]

// Slash Command Menu Component
export const SlashCommandMenu = forwardRef<any, SlashCommandProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [query, setQuery] = useState(props.query || '')

  // Filter items based on query
  const filteredItems = props.items.filter(item => {
    if (!query) return true
    
    const searchText = query.toLowerCase()
    
    return (
      item.title.toLowerCase().includes(searchText) ||
      item.description.toLowerCase().includes(searchText) ||
      item.keywords?.some(keyword => keyword.toLowerCase().includes(searchText)) ||
      item.searchTerms?.some(term => term.toLowerCase().includes(searchText)) ||
      item.category.toLowerCase().includes(searchText)
    )
  })

  // Group items by category
  const groupedItems = filteredItems.reduce((groups, item) => {
    const category = item.category
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(item)
    return groups
  }, {} as Record<string, SlashCommandItem[]>)

  const categoryOrder = ['Basic blocks', 'Lists', 'Content', 'Advanced', 'Media', 'Callouts']
  const orderedCategories = categoryOrder.filter(cat => groupedItems[cat]?.length > 0)

  const selectItem = useCallback((index: number) => {
    const item = filteredItems[index]
    if (item) {
      props.command(item)
    }
  }, [filteredItems, props])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowDown') {
        setSelectedIndex((prevIndex) => (prevIndex + 1) % filteredItems.length)
        return true
      }

      if (event.key === 'ArrowUp') {
        setSelectedIndex((prevIndex) => (prevIndex + filteredItems.length - 1) % filteredItems.length)
        return true
      }

      if (event.key === 'Enter') {
        selectItem(selectedIndex)
        return true
      }

      if (event.key === 'Escape') {
        return true
      }

      return false
    },
  }))

  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredItems])

  useEffect(() => {
    setQuery(props.query || '')
  }, [props.query])

  if (filteredItems.length === 0) {
    return (
      <div className="z-50 w-80 bg-white rounded-lg border border-gray-200 shadow-xl">
        <div className="p-4 text-center text-gray-500">
          <div className="text-sm">No results found</div>
          <div className="text-xs mt-1">Try a different search term</div>
        </div>
      </div>
    )
  }

  return (
    <div className="z-50 w-80 bg-white rounded-lg border border-gray-200 shadow-xl max-h-96 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-100 p-3">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">
            {query ? `Search results for "${query}"` : 'Basic blocks'}
          </span>
        </div>
      </div>

      <div className="p-2">
        {orderedCategories.map((category, categoryIndex) => (
          <div key={category} className={categoryIndex > 0 ? 'mt-4' : ''}>
            {query && (
              <div className="px-2 py-1 text-xs font-medium text-gray-400 uppercase tracking-wide">
                {category}
              </div>
            )}
            {groupedItems[category].map((item) => {
              const globalIndex = filteredItems.indexOf(item)
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-150',
                    globalIndex === selectedIndex
                      ? 'bg-blue-50 border border-blue-200 shadow-sm'
                      : 'hover:bg-gray-50 border border-transparent'
                  )}
                  onClick={() => props.command(item)}
                >
                  <div className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                    globalIndex === selectedIndex
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                  )}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm">
                      {item.title}
                    </div>
                    <div className="text-gray-500 text-xs mt-0.5 leading-relaxed">
                      {item.description}
                    </div>
                  </div>
                  {globalIndex === selectedIndex && (
                    <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      ↵
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 p-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>↑↓ to navigate</span>
          <span>↵ to select</span>
          <span>esc to close</span>
        </div>
      </div>
    </div>
  )
})

SlashCommandMenu.displayName = 'SlashCommandMenu'