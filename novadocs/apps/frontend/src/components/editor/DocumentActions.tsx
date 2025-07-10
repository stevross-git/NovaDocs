// components/editor/DocumentActions.tsx
import React, { useState, useEffect } from 'react'
import { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { 
  Save, 
  Download, 
  Copy, 
  Share2, 
  FileText, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Cloud,
  HardDrive,
  Database
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { minioService } from '@/lib/services/minioService'

interface DocumentActionsProps {
  editor: Editor | null
  pageId: string
  title?: string
  userId?: string
  onSave?: (content: string) => Promise<void>
}

export function DocumentActions({ editor, pageId, title = 'Untitled Document', userId = 'default-user', onSave }: DocumentActionsProps) {
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved')
  const [lastSaved, setLastSaved] = useState<Date | null>(new Date())
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveLocation, setSaveLocation] = useState<'local' | 'minio' | 'both'>('both')
  const [minioUrl, setMinioUrl] = useState<string | null>(null)

  // Auto-save functionality
  useEffect(() => {
    if (!editor) return

    const handleUpdate = () => {
      setHasUnsavedChanges(true)
      setSaveStatus('unsaved')
    }

    editor.on('update', handleUpdate)
    return () => editor.off('update', handleUpdate)
  }, [editor])

  // Auto-save every 30 seconds if there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges || !editor) return

    const autoSaveTimer = setTimeout(() => {
      handleSave()
    }, 30000) // 30 seconds

    return () => clearTimeout(autoSaveTimer)
  }, [hasUnsavedChanges, editor])

  const handleSave = async () => {
    if (!editor || !hasUnsavedChanges) return

    setSaveStatus('saving')
    
    try {
      const content = editor.getHTML()
      const plainText = editor.getText()
      
      // Save to multiple locations based on settings
      const savePromises: Promise<any>[] = []

      // Save to MinIO
      if (saveLocation === 'minio' || saveLocation === 'both') {
        const minioSave = minioService.saveDocument({
          pageId,
          title,
          content,
          userId,
          format: 'html'
        })
        savePromises.push(minioSave)

        // Also save as JSON for better data structure
        const jsonSave = minioService.saveDocument({
          pageId,
          title,
          content: JSON.stringify({
            html: content,
            text: plainText,
            title,
            wordCount: plainText.split(' ').length,
            characterCount: plainText.length
          }),
          userId,
          format: 'json'
        })
        savePromises.push(jsonSave)
      }

      // Save locally
      if (saveLocation === 'local' || saveLocation === 'both') {
        const localSave = new Promise<void>((resolve) => {
          localStorage.setItem(`novadocs_page_${pageId}`, content)
          localStorage.setItem(`novadocs_page_${pageId}_timestamp`, new Date().toISOString())
          localStorage.setItem(`novadocs_page_${pageId}_title`, title)
          resolve()
        })
        savePromises.push(localSave)
      }

      // Custom save handler
      if (onSave) {
        savePromises.push(onSave(content))
      }

      // Wait for all saves to complete
      const results = await Promise.allSettled(savePromises)
      
      // Check MinIO save result
      const minioResult = results[0]
      if (minioResult.status === 'fulfilled' && minioResult.value?.success) {
        setMinioUrl(minioResult.value.url)
      }

      // Check if any saves failed
      const hasFailures = results.some(result => 
        result.status === 'rejected' || 
        (result.status === 'fulfilled' && result.value?.success === false)
      )

      if (hasFailures) {
        setSaveStatus('error')
        console.error('Some saves failed:', results)
      } else {
        setSaveStatus('saved')
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
      }
      
    } catch (error) {
      console.error('Save failed:', error)
      setSaveStatus('error')
    }
  }

  const handleExportHTML = () => {
    if (!editor) return

    const content = editor.getHTML()
    const fullHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
        h1, h2, h3 { color: #1f2937; }
        blockquote { border-left: 4px solid #3b82f6; background: #eff6ff; padding: 1rem; margin: 1rem 0; }
        code { background: #f3f4f6; padding: 0.25rem; border-radius: 0.25rem; }
        pre { background: #1f2937; color: #f9fafb; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${content}
</body>
</html>`

    const blob = new Blob([fullHTML], { type: 'text/html' })
    downloadFile(blob, `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`)
  }

  const handleExportMarkdown = () => {
    if (!editor) return

    const html = editor.getHTML()
    const markdown = htmlToMarkdown(html)
    const blob = new Blob([markdown], { type: 'text/markdown' })
    downloadFile(blob, `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`)
  }

  const handleExportJSON = () => {
    if (!editor) return

    const data = {
      title,
      html: editor.getHTML(),
      text: editor.getText(),
      json: editor.getJSON(),
      metadata: {
        pageId,
        userId,
        exportedAt: new Date().toISOString(),
        characterCount: editor.storage.characterCount?.characters() || 0,
        wordCount: editor.getText().split(' ').length
      }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    downloadFile(blob, `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`)
  }

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const htmlToMarkdown = (html: string): string => {
    return html
      .replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1\n\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/g, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/g, '*$1*')
      .replace(/<code[^>]*>(.*?)<\/code>/g, '`$1`')
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/g, '> $1\n\n')
      .replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<li[^>]*>(.*?)<\/li>/g, '- $1\n')
      .replace(/<ul[^>]*>(.*?)<\/ul>/g, '$1\n')
      .replace(/<ol[^>]*>(.*?)<\/ol>/g, '$1\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim()
  }

  const handleCopyContent = async () => {
    if (!editor) return

    try {
      const text = editor.getText()
      await navigator.clipboard.writeText(text)
      console.log('Content copied to clipboard')
    } catch (error) {
      console.error('Failed to copy content:', error)
    }
  }

  const handleShare = async () => {
    try {
      if (minioUrl) {
        await navigator.clipboard.writeText(minioUrl)
        console.log('MinIO URL copied to clipboard')
      } else {
        await navigator.clipboard.writeText(window.location.href)
        console.log('Page URL copied to clipboard')
      }
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  const getStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return <Clock className="h-4 w-4 animate-spin" />
      case 'saved':
        return saveLocation.includes('minio') ? 
          <Cloud className="h-4 w-4 text-green-600" /> : 
          <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Save className="h-4 w-4" />
    }
  }

  const getStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving...'
      case 'saved':
        const location = saveLocation === 'both' ? 'Cloud & Local' : 
                        saveLocation === 'minio' ? 'Cloud' : 'Local'
        return lastSaved ? `Saved to ${location} ${lastSaved.toLocaleTimeString()}` : `Saved to ${location}`
      case 'error':
        return 'Save failed'
      case 'unsaved':
        return 'Unsaved changes'
      default:
        return 'Save'
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white border-b">
      {/* Save Button */}
      <Button
        variant={hasUnsavedChanges ? "default" : "ghost"}
        size="sm"
        onClick={handleSave}
        disabled={saveStatus === 'saving' || !hasUnsavedChanges}
        className={cn(
          "flex items-center gap-2",
          saveStatus === 'error' && "border-red-300 bg-red-50 hover:bg-red-100"
        )}
      >
        {getStatusIcon()}
        <span className="hidden sm:inline">{getStatusText()}</span>
      </Button>

      {/* Save Location Toggle */}
      <div className="flex items-center gap-1 ml-2">
        <Button
          variant={saveLocation === 'local' ? "default" : "ghost"}
          size="sm"
          onClick={() => setSaveLocation('local')}
          title="Save locally only"
          className="h-8 w-8 p-0"
        >
          <HardDrive className="h-3 w-3" />
        </Button>
        <Button
          variant={saveLocation === 'minio' ? "default" : "ghost"}
          size="sm"
          onClick={() => setSaveLocation('minio')}
          title="Save to cloud only"
          className="h-8 w-8 p-0"
        >
          <Cloud className="h-3 w-3" />
        </Button>
        <Button
          variant={saveLocation === 'both' ? "default" : "ghost"}
          size="sm"
          onClick={() => setSaveLocation('both')}
          title="Save to both cloud and local"
          className="h-8 w-8 p-0"
        >
          <Database className="h-3 w-3" />
        </Button>
      </div>

      {/* Export Options */}
      <div className="flex items-center gap-1 ml-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExportHTML}
          title="Export as HTML"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">HTML</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleExportMarkdown}
          title="Export as Markdown"
        >
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">MD</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleExportJSON}
          title="Export as JSON"
        >
          <Database className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">JSON</span>
        </Button>
      </div>

      {/* Document Actions */}
      <div className="flex items-center gap-1 ml-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyContent}
          title="Copy content"
        >
          <Copy className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">Copy</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          title={minioUrl ? "Share cloud link" : "Share page link"}
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">Share</span>
        </Button>
      </div>

      {/* Document Info */}
      <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
        <FileText className="h-4 w-4" />
        <span className="hidden md:inline">
          {editor?.storage.characterCount?.characters() || 0} chars
        </span>
        {minioUrl && (
          <span className="hidden lg:inline text-green-600" title="Saved to cloud">
            ☁️
          </span>
        )}
        {saveStatus === 'unsaved' && (
          <span className="text-orange-600 font-medium">●</span>
        )}
      </div>
    </div>
  )
}