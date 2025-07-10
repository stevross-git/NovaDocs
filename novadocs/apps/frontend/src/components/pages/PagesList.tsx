// apps/frontend/src/components/pages/PagesList.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Plus, FileText, Search, Filter, MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import { usePages, usePage } from '@/hooks/usePage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CreatePageDialog } from './CreatePageDialog'
import { toast } from 'sonner'

interface Page {
  id: string
  title: string
  content: string
  created_at: string
  updated_at: string
  version: number
}

export function PagesList() {
  const { data: pages, isLoading, error } = usePages()
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated')

  const filteredPages = React.useMemo(() => {
    if (!pages) return []
    
    let filtered = pages.filter((page: Page) =>
      page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.content.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Sort pages
    filtered.sort((a: Page, b: Page) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title)
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'updated':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      }
    })

    return filtered
  }, [pages, searchQuery, sortBy])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
          <Button disabled>
            <Plus className="w-4 h-4 mr-2" />
            New Page
          </Button>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <FileText className="w-12 h-12 mx-auto opacity-50" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load pages</h3>
        <p className="text-gray-600">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
          <p className="text-gray-600">
            {pages?.length || 0} page{pages?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Page
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Sort by {sortBy}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSortBy('updated')}>
              Last updated
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('created')}>
              Date created
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('title')}>
              Title
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Pages List */}
      {filteredPages.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No pages found' : 'No pages yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery 
              ? `No pages match "${searchQuery}"`
              : 'Get started by creating your first page'
            }
          </p>
          {!searchQuery && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create your first page
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPages.map((page: Page) => (
            <PageItem key={page.id} page={page} />
          ))}
        </div>
      )}

      {/* Create Page Dialog */}
      <CreatePageDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
      />
    </div>
  )
}

function PageItem({ page }: { page: Page }) {
  const { deletePage } = usePage(page.id)
  
  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${page.title}"?`)) {
      try {
        await deletePage()
        toast.success('Page deleted successfully')
      } catch (error) {
        toast.error('Failed to delete page')
      }
    }
  }

  const excerpt = page.content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .slice(0, 150)
    .trim()

  return (
    <div className="group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <Link 
            href={`/page/${page.id}`}
            className="block hover:text-blue-600 transition-colors"
          >
            <h3 className="text-lg font-medium text-gray-900 truncate">
              {page.title || 'Untitled'}
            </h3>
          </Link>
          
          {excerpt && (
            <p className="text-gray-600 text-sm mt-1 line-clamp-2">
              {excerpt}...
            </p>
          )}
          
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span>
              Updated {formatDistanceToNow(new Date(page.updated_at), { addSuffix: true })}
            </span>
            <Badge variant="secondary" className="text-xs">
              v{page.version}
            </Badge>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/page/${page.id}`}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleDelete}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// apps/frontend/src/components/pages/CreatePageDialog.tsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { usePage } from '@/hooks/usePage'
import { toast } from 'sonner'

interface CreatePageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePageDialog({ open, onOpenChange }: CreatePageDialogProps) {
  const router = useRouter()
  const { createPage } = usePage()
  
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      toast.error('Please enter a page title')
      return
    }

    setIsCreating(true)
    
    try {
      const newPage = await createPage({
        title: title.trim(),
        content: content.trim(),
        workspace_id: 'default'
      })
      
      toast.success('Page created successfully')
      onOpenChange(false)
      setTitle('')
      setContent('')
      
      // Navigate to the new page
      router.push(`/page/${newPage.id}`)
      
    } catch (error) {
      console.error('Failed to create page:', error)
      toast.error('Failed to create page')
    } finally {
      setIsCreating(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isCreating) {
      onOpenChange(newOpen)
      if (!newOpen) {
        setTitle('')
        setContent('')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Page</DialogTitle>
          <DialogDescription>
            Give your page a title and optional initial content.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter page title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isCreating}
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">Initial Content (Optional)</Label>
            <Textarea
              id="content"
              placeholder="Start writing..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isCreating}
              rows={4}
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || !title.trim()}>
              {isCreating ? 'Creating...' : 'Create Page'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// apps/frontend/src/components/layout/Navigation.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  FileText, 
  Users, 
  Search, 
  Settings, 
  Plus,
  Home,
  Database,
  Upload
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { usePages, useUsers } from '@/hooks/usePage'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Pages', href: '/pages', icon: FileText },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Upload', href: '/upload', icon: Upload },
  { name: 'Databases', href: '/databases', icon: Database },
]

export function Navigation() {
  const pathname = usePathname()
  const { data: pages } = usePages()
  const { data: users } = useUsers()

  return (
    <nav className="w-64 bg-white border-r border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <Link href="/" className="flex items-center">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">NovaDocs</span>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-gray-200">
        <Button asChild size="sm" className="w-full">
          <Link href="/pages?create=true">
            <Plus className="w-4 h-4 mr-2" />
            New Page
          </Link>
        </Button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 p-4">
        <div className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
                
                {/* Show counts for pages and users */}
                {item.name === 'Pages' && pages && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {pages.length}
                  </Badge>
                )}
                {item.name === 'Users' && users && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {users.length}
                  </Badge>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <Link
          href="/settings"
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:text-gray-900 hover:bg-gray-50 transition-colors"
        >
          <Settings className="w-5 h-5 mr-3" />
          Settings
        </Link>
      </div>
    </nav>
  )
}

// apps/frontend/src/app/page.tsx - Updated Homepage
'use client'

import React from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { 
  FileText, 
  Users, 
  TrendingUp, 
  Plus,
  ArrowRight,
  Clock,
  Edit
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePages, useUsers } from '@/hooks/usePage'

export default function HomePage() {
  const { data: pages, isLoading: pagesLoading } = usePages()
  const { data: users, isLoading: usersLoading } = useUsers()

  const recentPages = React.useMemo(() => {
    if (!pages) return []
    return [...pages]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5)
  }, [pages])

  const stats = [
    {
      name: 'Total Pages',
      value: pages?.length || 0,
      icon: FileText,
      color: 'text-blue-600',
      loading: pagesLoading
    },
    {
      name: 'Team Members',
      value: users?.length || 0,
      icon: Users,
      color: 'text-green-600',
      loading: usersLoading
    },
    {
      name: 'Recent Activity',
      value: recentPages.length,
      icon: TrendingUp,
      color: 'text-purple-600',
      loading: pagesLoading
    }
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to NovaDocs
        </h1>
        <p className="text-gray-600 text-lg">
          Your collaborative knowledge base and documentation platform
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Button asChild size="lg" className="h-20">
          <Link href="/pages?create=true">
            <div className="text-center">
              <Plus className="w-6 h-6 mx-auto mb-2" />
              <span>Create New Page</span>
            </div>
          </Link>
        </Button>
        
        <Button asChild variant="outline" size="lg" className="h-20">
          <Link href="/pages">
            <div className="text-center">
              <FileText className="w-6 h-6 mx-auto mb-2" />
              <span>Browse Pages</span>
            </div>
          </Link>
        </Button>
        
        <Button asChild variant="outline" size="lg" className="h-20">
          <Link href="/upload">
            <div className="text-center">
              <Edit className="w-6 h-6 mx-auto mb-2" />
              <span>Import Document</span>
            </div>
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.name}
              </CardTitle>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stat.loading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                ) : (
                  stat.value
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Pages */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Pages</CardTitle>
            <CardDescription>
              Your most recently updated documentation
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/pages">
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {pagesLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : recentPages.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No pages yet
              </h3>
              <p className="text-gray-600 mb-4">
                Get started by creating your first page
              </p>
              <Button asChild>
                <Link href="/pages?create=true">
                  <Plus className="w-4 h-4 mr-2" />
                  Create your first page
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentPages.map((page) => (
                <Link
                  key={page.id}
                  href={`/page/${page.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-medium text-gray-900 truncate">
                        {page.title || 'Untitled'}
                      </h4>
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          Updated {formatDistanceToNow(new Date(page.updated_at), { addSuffix: true })}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          v{page.version}
                        </Badge>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}