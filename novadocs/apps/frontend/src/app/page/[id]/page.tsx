// apps/frontend/src/app/page/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CollaborativeEditor } from '@/components/editor/CollaborativeEditor'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit } from 'lucide-react'
import Link from 'next/link'

interface PageData {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
  author: {
    id: string
    name: string
    avatar: string
  }
  isPublic: boolean
}

export default function SharedPageView() {
  const { id } = useParams()
  const { user, loading } = useAuth()
  const [pageData, setPageData] = useState<PageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchPageData(id as string)
    }
  }, [id])

  const fetchPageData = async (pageId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/pages/${pageId}`)
      
      if (!response.ok) {
        throw new Error('Page not found')
      }

      const data = await response.json()
      setPageData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load page')
    } finally {
      setIsLoading(false)
    }
  }

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!pageData) return null

  const canEdit = user && (user.id === pageData.author.id || pageData.isPublic)

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            
            <div>
              <h1 className="text-xl font-semibold">{pageData.title}</h1>
              <p className="text-sm text-gray-500">
                By {pageData.author.name} • {pageData.updatedAt.toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <Link href={`/editor?page=${pageData.id}`}>
                <Button size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
            )}
            
            {!user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/api/auth/google'}
              >
                Login to Edit
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full max-w-4xl mx-auto">
          <CollaborativeEditor
            pageId={pageData.id}
            initialContent={pageData.content}
            editable={canEdit}
            className="h-full"
          />
        </div>
      </main>
    </div>
  )
}