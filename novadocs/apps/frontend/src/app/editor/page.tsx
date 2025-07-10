// app/editor/page.tsx
'use client'

import { CollaborativeEditor } from '@/components/editor/CollaborativeEditor'

export default function EditorPage() {
  return (
    <div className="h-screen flex flex-col">
      <header className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">NovaDocs Editor</h1>
          <div className="text-sm text-gray-500">
            Demo Page
          </div>
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden">
        <CollaborativeEditor
          pageId="demo-page-123"
          initialContent='<h1>Welcome to NovaDocs!</h1><p>Start typing or use "/" to add blocks...</p>'
          onUpdate={(content) => console.log('Content updated:', content)}
          editable={true}
        />
      </main>
    </div>
  )
}