'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  FileText,
  Settings, 
  BarChart3, 
  Users, 
  Database,
  Search,
  Plus,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Pencil
} from 'lucide-react'
import { useFolders } from '@/hooks/useFolders'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pagesExpanded, setPagesExpanded] = useState(true)
  const [foldersExpanded, setFoldersExpanded] = useState(true)
  const pathname = usePathname()

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Editor', href: '/editor', icon: FileText },
    { name: 'Stats', href: '/stats', icon: BarChart3 },
    { name: 'Search', href: '/search', icon: Search },
    { name: 'Database', href: '/database', icon: Database },
    { name: 'Users', href: '/users', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  const recentPages = [
    { name: 'Getting Started', href: '/pages/getting-started', updated: '2 min ago' },
    { name: 'API Documentation', href: '/pages/api-docs', updated: '1 hour ago' },
    { name: 'Team Guidelines', href: '/pages/guidelines', updated: '3 hours ago' },
    { name: 'Project Roadmap', href: '/pages/roadmap', updated: '1 day ago' },
  ]

  const { folders, renameFolder } = useFolders()

  const isActive = (href: string) => pathname === href

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-lg">NovaDocs</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}

            {/* Folders Section */}
            <div className="pt-4">
              <button
                onClick={() => setFoldersExpanded(!foldersExpanded)}
                className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md"
              >
                {foldersExpanded ? (
                  <ChevronDown className="mr-2 h-4 w-4" />
                ) : (
                  <ChevronRight className="mr-2 h-4 w-4" />
                )}
                {foldersExpanded ? (
                  <FolderOpen className="mr-2 h-4 w-4" />
                ) : (
                  <Folder className="mr-2 h-4 w-4" />
                )}
                Folders
              </button>
              
              {foldersExpanded && (
                <div className="mt-2 space-y-1">
                  {folders.map((folder) => (
                    <div key={folder.id} className="px-4 py-2 text-sm text-gray-600">
                      {folder.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Pages Section */}
            <div className="pt-4">
              <button
                onClick={() => setPagesExpanded(!pagesExpanded)}
                className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md"
              >
                {pagesExpanded ? (
                  <ChevronDown className="mr-2 h-4 w-4" />
                ) : (
                  <ChevronRight className="mr-2 h-4 w-4" />
                )}
                {pagesExpanded ? (
                  <FolderOpen className="mr-2 h-4 w-4" />
                ) : (
                  <Folder className="mr-2 h-4 w-4" />
                )}
                Recent Pages
              </button>
              
              {pagesExpanded && (
                <div className="mt-2 space-y-1">
                  {recentPages.map((page) => (
                    <Link
                      key={page.name}
                      href={page.href}
                      className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <div className="truncate">{page.name}</div>
                      <div className="text-xs text-gray-400">{page.updated}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Quick Actions */}
          <div className="px-4 pb-4">
            <div className="border-t border-gray-200 pt-4">
              <Link
                href="/editor"
                className="flex items-center w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Page
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navigation bar for mobile */}
        <div className="bg-white border-b border-gray-200 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">NovaDocs</h1>
            <div className="w-6 h-6"></div>
          </div>
        </div>

        {/* Page content - This is the key fix */}
        <main className="flex-1 overflow-auto bg-gradient-to-br from-blue-50 to-indigo-100">
          {children}
        </main>
      </div>
    </div>
  )
}