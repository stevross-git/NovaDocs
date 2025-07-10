// apps/frontend/src/app/editor/page.tsx
'use client'

import { useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CollaborativeEditor } from '@/components/editor/CollaborativeEditor'
import { 
  Save,
  FileText,
  Upload,
  Download,
  ArrowLeft,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

export default function EditorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pageId = searchParams.get('page')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [title, setTitle] = useState('Untitled Document')
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('unsaved')

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus('saving')
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/pages`, {
        method: pageId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          workspace_id: 'default'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSaveStatus('saved')
        
        // If this is a new page, redirect to the edit URL with the page ID
        if (!pageId && data.page?.id) {
          router.push(`/editor?page=${data.page.id}`)
        }
        
        // Show success message
        setTimeout(() => setSaveStatus('unsaved'), 2000)
      } else {
        throw new Error('Failed to save page')
      }
    } catch (error) {
      console.error('Save failed:', error)
      setSaveStatus('unsaved')
      alert('Failed to save page. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleImportFile = () => {
    fileInputRef.current?.click()
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)

    try {
      const fileContent = await readFileAsText(file)
      
      // Set the title from filename (without extension)
      const fileName = file.name.replace(/\.[^/.]+$/, '')
      setTitle(fileName)
      
      // Process content based on file type
      let processedContent = fileContent
      
      if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
        // Markdown file - use as-is
        processedContent = fileContent
      } else if (file.name.endsWith('.txt')) {
        // Text file - wrap in markdown
        processedContent = `# ${fileName}\n\n${fileContent}`
      } else if (file.name.endsWith('.html')) {
        // HTML file - convert basic tags to markdown
        processedContent = convertBasicHtmlToMarkdown(fileContent)
      } else {
        // Other file types - treat as plain text
        processedContent = `# ${fileName}\n\n\`\`\`\n${fileContent}\n\`\`\``
      }
      
      setContent(processedContent)
      setSaveStatus('unsaved')
      
    } catch (error) {
      console.error('Import failed:', error)
      alert('Failed to import file. Please check the file format and try again.')
    } finally {
      setIsImporting(false)
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = (e) => reject(e)
      reader.readAsText(file)
    })
  }

  const convertBasicHtmlToMarkdown = (html: string): string => {
    // Basic HTML to Markdown conversion
    return html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '') // Remove remaining HTML tags
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Clean up multiple newlines
  }

  const handleExport = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getSaveButtonText = () => {
    if (isSaving) return 'Saving...'
    if (saveStatus === 'saved') return 'Saved!'
    return 'Save'
  }

  const getSaveButtonIcon = () => {
    if (isSaving) return <Loader2 className="h-4 w-4 animate-spin" />
    return <Save className="h-4 w-4" />
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-gray-600" />
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xl font-semibold border-none shadow-none p-0 focus:ring-0"
                placeholder="Document title..."
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportFile}
              disabled={isImporting}
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Import
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!content}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className={`
                ${saveStatus === 'saved' ? 'bg-green-600 hover:bg-green-700' : ''}
                ${saveStatus === 'saving' ? 'bg-blue-600' : ''}
              `}
            >
              {getSaveButtonIcon()}
              <span className="ml-2">{getSaveButtonText()}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Editor */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full max-w-4xl mx-auto p-6">
          <div className="h-full bg-white rounded-lg shadow-sm border">
            <CollaborativeEditor
              pageId={pageId || 'new-page'}
              initialContent={content || '<h1>Welcome to NovaDocs!</h1><p>Start typing or use "/" to add blocks...</p>'}
              onUpdate={(newContent) => {
                setContent(newContent)
                setSaveStatus('unsaved')
              }}
              editable={true}
              className="h-full"
            />
          </div>
        </div>
      </main>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt,.html,.htm"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Import instructions overlay */}
      {isImporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <h3 className="text-lg font-semibold">Importing Document</h3>
            </div>
            <p className="text-gray-600">
              Processing your file and converting it to markdown format...
            </p>
          </div>
        </div>
      )}
    </div>
  )
}