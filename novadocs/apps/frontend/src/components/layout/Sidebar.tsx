// apps/frontend/src/components/layout/Sidebar.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Edit, 
  BarChart3, 
  Search, 
  Database, 
  Users, 
  Settings,
  Plus,
  FileText,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [isRecentPagesExpanded, setIsRecentPagesExpanded] = useState(true)
  const [isFoldersExpanded, setIsFoldersExpanded] = useState(false)

  const navigationItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/editor', label: 'Editor', icon: Edit },
    { href: '/stats', label: 'Stats', icon: BarChart3 },
    { href: '/search', label: 'Search', icon: Search },
    { href: '/database', label: 'Database', icon: Database },
    { href: '/users', label: 'Users', icon: Users },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  const recentPages = [
    { id: '1', title: 'Getting Started', href: '/page/getting-started', updatedAt: '2 hours ago' },
    { id: '2', title: 'API Documentation', href: '/page/api-docs', updatedAt: '1 day ago' },
    { id: '3', title: 'Team Guidelines', href: '/page/team-guidelines', updatedAt: '3 hours ago' },
    { id: '4', title: 'Project Roadmap', href: '/page/project-roadmap', updatedAt: '2 days ago' },
  ]

  return (
    <div className={cn("w-64 bg-white border-r border-gray-200 flex flex-col", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-lg">NovaDocs</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-blue-50 text-blue-700" 
                  : "text-gray-700 hover:bg-gray-50"
              )}>
                <Icon className="h-4 w-4" />
                {item.label}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Folders Section */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => setIsFoldersExpanded(!isFoldersExpanded)}
          className="flex items-center gap-2 w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900 mb-2"
        >
          {isFoldersExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Folders
        </button>
        
        {isFoldersExpanded && (
          <div className="ml-6 space-y-1">
            <div className="text-sm text-gray-500 py-1">No folders yet</div>
          </div>
        )}
      </div>

      {/* Recent Pages */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => setIsRecentPagesExpanded(!isRecentPagesExpanded)}
          className="flex items-center gap-2 w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900 mb-2"
        >
          {isRecentPagesExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Recent Pages
        </button>
        
        {isRecentPagesExpanded && (
          <div className="ml-6 space-y-1">
            {recentPages.map((page) => (
              <Link key={page.id} href={page.href}>
                <div className="flex items-center gap-2 px-2 py-1 rounded text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                  <FileText className="h-3 w-3" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{page.title}</div>
                    <div className="text-xs text-gray-400">{page.updatedAt}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* New Page Button */}
      <div className="p-4 border-t border-gray-200">
        <Link href="/editor">
          <Button className="w-full justify-start" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Page
          </Button>
        </Link>
      </div>
    </div>
  )
}