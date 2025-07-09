'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus,
  BarChart3,
  Search,
  Database,
  FileText,
  Users,
  Clock,
  TrendingUp,
  Edit,
  Share
} from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')

  const quickStats = [
    { label: 'Total Pages', value: '24', icon: FileText, color: 'bg-blue-500' },
    { label: 'Active Users', value: '8', icon: Users, color: 'bg-green-500' },
    { label: 'This Week', value: '+12', icon: TrendingUp, color: 'bg-purple-500' },
    { label: 'Last Updated', value: '2h ago', icon: Clock, color: 'bg-orange-500' },
  ]

  const recentPages = [
    { 
      id: '1', 
      title: 'Getting Started', 
      preview: 'Welcome to NovaDocs! This guide will help you get started with our collaborative platform...', 
      updatedAt: '2 hours ago',
      author: 'John Doe',
      isShared: true
    },
    { 
      id: '2', 
      title: 'API Documentation', 
      preview: 'Complete API reference for developers building integrations with NovaDocs...', 
      updatedAt: '1 day ago',
      author: 'Jane Smith',
      isShared: false
    },
    { 
      id: '3', 
      title: 'Team Guidelines', 
      preview: 'Our team collaboration guidelines and best practices for using NovaDocs...', 
      updatedAt: '3 hours ago',
      author: 'Mike Johnson',
      isShared: true
    },
    { 
      id: '4', 
      title: 'Project Roadmap', 
      preview: 'Q1 2025 roadmap with upcoming features and improvements...', 
      updatedAt: '2 days ago',
      author: 'Sarah Wilson',
      isShared: false
    },
  ]

  const quickActions = [
    { 
      label: 'New Page', 
      icon: Plus, 
      href: '/editor',
      color: 'bg-blue-500 hover:bg-blue-600',
      description: 'Create a new document'
    },
    { 
      label: 'View Stats', 
      icon: BarChart3, 
      href: '/stats',
      color: 'bg-purple-500 hover:bg-purple-600',
      description: 'Analytics and insights'
    },
    { 
      label: 'Search', 
      icon: Search, 
      href: '/search',
      color: 'bg-green-500 hover:bg-green-600',
      description: 'Find documents quickly'
    },
    { 
      label: 'Database', 
      icon: Database, 
      href: '/database',
      color: 'bg-orange-500 hover:bg-orange-600',
      description: 'Manage data views'
    },
  ]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to NovaDocs
          </h1>
          <p className="text-gray-600">
            A modern collaborative wiki platform for teams
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {quickStats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.label} href={action.href}>
                  <div className={`${action.color} text-white p-6 rounded-lg transition-colors cursor-pointer`}>
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="h-6 w-6" />
                      <span className="font-semibold">{action.label}</span>
                    </div>
                    <p className="text-sm opacity-90">{action.description}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Recent Pages */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Pages</h2>
            <Link href="/search">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
          
          <div className="space-y-4">
            {recentPages.map((page) => (
              <div key={page.id} className="bg-white p-6 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Link href={`/page/${page.id}`}>
                        <h3 className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer">
                          {page.title}
                        </h3>
                      </Link>
                      {page.isShared && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Share className="h-3 w-3" />
                          Shared
                        </div>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-2 line-clamp-2">{page.preview}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>By {page.author}</span>
                      <span>{page.updatedAt}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Link href={`/editor?page=${page.id}`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm">
                      <Share className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Test API Buttons */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">API Testing</h2>
          <div className="flex gap-4">
            <Button
              onClick={() => window.open('/api/health', '_blank')}
              className="bg-blue-500 hover:bg-blue-600"
            >
              Test REST API
            </Button>
            <Button
              onClick={() => window.open('/graphql', '_blank')}
              className="bg-purple-500 hover:bg-purple-600"
            >
              Test GraphQL
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}