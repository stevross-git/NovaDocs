'use client'

import { CollaborativeEditor } from '@/components/editor/CollaborativeEditor'
import { useAuth } from '@/hooks/useAuth'

export default function TestPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please login to continue</h1>
          <button
            onClick={() => window.location.href = '/api/auth/google'}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Login with Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">NovaDocs Editor Test</h1>
      
      <div className="border rounded-lg overflow-hidden">
        <CollaborativeEditor
          pageId="test-page-123"
          initialContent='<h1>Welcome to NovaDocs!</h1><p>Start typing or use "/" to add blocks...</p>'
          onUpdate={(content) => console.log('Content updated:', content)}
          editable={true}
        />
      </div>
    </div>
  )
}
