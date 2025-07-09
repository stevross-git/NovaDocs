'use client'

import { useState, useEffect } from 'react'
import { Save, Clock, Wifi, WifiOff, FolderPlus } from 'lucide-react'
import { useFolders } from '@/hooks/useFolders'

export default function EditorPage() {
  const [content, setContent] = useState('# Welcome to NovaDocs Editor\n\nStart typing your content here...\n\n## Features\n- Real-time editing\n- Markdown preview\n- Auto-save\n- Collaboration ready\n\n> This is a blockquote\n\n```javascript\nconst hello = "world";\nconsole.log(hello);\n```')
  const [title, setTitle] = useState('My New Page')
  const [isConnected, setIsConnected] = useState(true)
  const [lastSaved, setLastSaved] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const { folders, addPageToFolder } = useFolders()

  // Auto-save functionality
  useEffect(() => {
    const timer = setTimeout(() => {
      handleAutoSave()
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [content, title])

  const handleAutoSave = async () => {
    try {
      setSaveStatus('Saving...')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          workspace_id: 'demo-workspace'
        })
      })
      
      if (response.ok) {
        setSaveStatus('✅ Saved')
        setLastSaved(new Date().toLocaleTimeString())
        setIsConnected(true)
        setTimeout(() => setSaveStatus(''), 2000)
      } else {
        setSaveStatus('❌ Error')
        setTimeout(() => setSaveStatus(''), 2000)
      }
    } catch (error) {
      setSaveStatus('❌ Offline')
      setIsConnected(false)
      setTimeout(() => setSaveStatus(''), 2000)
    }
  }

  const handleSave = async () => {
    await handleAutoSave()
  }

  const handleSaveToFolder = (folderId: string) => {
    const pageId = title.toLowerCase().replace(/\s+/g, '-')
    addPageToFolder(folderId, {
      id: pageId,
      title,
      href: `/pages/${pageId}`
    })
  }

  // Simple markdown-to-HTML converter
  const renderMarkdown = (text) => {
    return text
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mb-3">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-medium mb-2">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
      .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-blue-500 pl-4 italic my-4">$1</blockquote>')
      .replace(/^- (.*$)/gm, '<li class="ml-4">• $1</li>')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto"><code>$2</code></pre>')
      .replace(/\n/g, '<br>')
  }

  return (
    <div className="h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">Page Editor</h1>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              <span>{isConnected ? 'Online' : 'Offline'}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {saveStatus && (
              <span className="text-sm text-gray-600 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {saveStatus}
              </span>
            )}
            {lastSaved && (
              <span className="text-xs text-gray-500">Last saved: {lastSaved}</span>
            )}
            <select
              onChange={(e) => {
                const fid = e.target.value
                if (fid) handleSaveToFolder(fid)
                e.currentTarget.selectedIndex = 0
              }}
              className="text-sm border rounded-md px-2 py-1"
            >
              <option value="">Save to folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleSave}
              className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Editor */}
            <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
              <div className="p-6 border-b">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-2xl font-bold text-gray-900 bg-transparent border-none outline-none placeholder-gray-400"
                  placeholder="Page Title"
                />
              </div>
              
              <div className="flex-1 p-6">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-full text-gray-700 bg-transparent border-none outline-none resize-none placeholder-gray-400 font-mono text-sm"
                  placeholder="Start writing your content here..."
                />
              </div>
            </div>
            
            {/* Preview */}
            <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">Live Preview</h2>
              </div>
              
              <div className="flex-1 p-6 overflow-y-auto">
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
