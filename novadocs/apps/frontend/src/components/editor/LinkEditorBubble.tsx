// components/editor/LinkEditorBubble.tsx
import React, { useState, useEffect, useRef } from 'react'
import { BubbleMenu, Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Link, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  Check, 
  X,
  Copy,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LinkEditorBubbleProps {
  editor: Editor | null
}

export function LinkEditorBubble({ editor }: LinkEditorBubbleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [url, setUrl] = useState('')
  const [displayText, setDisplayText] = useState('')
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  if (!editor) return null

  const isLinkActive = editor.isActive('link')
  
  if (!isLinkActive) return null

  const currentLink = editor.getAttributes('link')
  const selectedText = editor.state.doc.textBetween(
    editor.state.selection.from,
    editor.state.selection.to
  )

  const handleEdit = () => {
    setUrl(currentLink.href || '')
    setDisplayText(selectedText)
    setTitle(currentLink.title || '')
    setIsEditing(true)
  }

  const handleSave = () => {
    if (!url.trim()) {
      handleRemove()
      return
    }

    // Ensure URL has protocol
    const finalUrl = url.match(/^https?:\/\//) ? url : `https://${url}`
    
    // Update the link
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({
        href: finalUrl,
        title: title.trim() || undefined,
        target: '_blank'
      })
      .run()

    // Update display text if changed
    if (displayText && displayText !== selectedText) {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .insertContent(displayText)
        .run()
    }

    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setUrl('')
    setDisplayText('')
    setTitle('')
  }

  const handleRemove = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setIsEditing(false)
  }

  const handleCopyLink = async () => {
    if (currentLink.href) {
      try {
        await navigator.clipboard.writeText(currentLink.href)
        // Could add toast notification here
        console.log('Link copied to clipboard')
      } catch (error) {
        console.error('Failed to copy link:', error)
      }
    }
  }

  const handleOpenLink = () => {
    if (currentLink.href) {
      window.open(currentLink.href, '_blank', 'noopener,noreferrer')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  const getDomainFromUrl = (url: string): string => {
    try {
      const domain = new URL(url).hostname
      return domain.replace(/^www\./, '')
    } catch {
      return url
    }
  }

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url.match(/^https?:\/\//) ? url : `https://${url}`)
      return true
    } catch {
      return false
    }
  }

  if (isEditing) {
    return (
      <BubbleMenu
        editor={editor}
        tippyOptions={{ 
          duration: 100,
          placement: 'bottom',
          maxWidth: 'none'
        }}
        className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-80"
      >
        <div className="space-y-3">
          {/* URL Input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">Link URL</label>
            <Input
              ref={inputRef}
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(
                "text-sm",
                url && !isValidUrl(url) && "border-red-300 focus:border-red-500"
              )}
            />
          </div>

          {/* Display Text Input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">Display Text</label>
            <Input
              type="text"
              placeholder="Link text"
              value={displayText}
              onChange={(e) => setDisplayText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-sm"
            />
          </div>

          {/* Title Input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">Title (optional)</label>
            <Input
              type="text"
              placeholder="Tooltip text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!url.trim() || (url && !isValidUrl(url))}
              className="flex-1"
            >
              <Check className="h-3 w-3 mr-1" />
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleRemove}
              title="Remove link"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </BubbleMenu>
    )
  }

  // View mode
  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ 
        duration: 100,
        placement: 'bottom'
      }}
      className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex items-center gap-1"
    >
      {/* Link Info */}
      <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded max-w-64">
        <Link className="h-3 w-3 text-gray-500 flex-shrink-0" />
        <span className="text-xs text-gray-700 truncate" title={currentLink.href}>
          {getDomainFromUrl(currentLink.href)}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenLink}
          title="Open link"
          className="h-7 w-7 p-0"
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyLink}
          title="Copy link"
          className="h-7 w-7 p-0"
        >
          <Copy className="h-3 w-3" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEdit}
          title="Edit link"
          className="h-7 w-7 p-0"
        >
          <Edit3 className="h-3 w-3" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          title="Remove link"
          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </BubbleMenu>
  )
}