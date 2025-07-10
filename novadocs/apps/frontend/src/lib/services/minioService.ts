// lib/services/minioService.ts - Client-side service that calls the API
interface SaveDocumentParams {
  pageId: string
  title: string
  content: string
  userId: string
  format?: 'html' | 'json' | 'markdown'
}

interface DocumentMetadata {
  id: string
  title: string
  userId: string
  createdAt: string
  updatedAt: string
  size: number
  format: string
  version: number
}

class MinIOService {
  private baseUrl = '/api/documents'

  async saveDocument({
    pageId,
    title,
    content,
    userId,
    format = 'html'
  }: SaveDocumentParams): Promise<{ success: boolean; url?: string; error?: string; metadata?: DocumentMetadata }> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageId,
          title,
          content,
          userId,
          format
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Failed to save document'
        }
      }

      return result

    } catch (error) {
      console.error('Failed to save document:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      }
    }
  }

  async getDocument(pageId: string, userId: string, format: string = 'html'): Promise<{
    success: boolean
    content?: string
    metadata?: DocumentMetadata
    error?: string
  }> {
    try {
      const params = new URLSearchParams({
        pageId,
        userId,
        format
      })

      const response = await fetch(`${this.baseUrl}?${params}`)
      const result = await response.json()
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Failed to retrieve document'
        }
      }

      return result

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      }
    }
  }

  async getUserDocuments(userId: string): Promise<DocumentMetadata[]> {
    try {
      const params = new URLSearchParams({
        userId,
        list: 'true'
      })

      const response = await fetch(`${this.baseUrl}?${params}`)
      const result = await response.json()
      
      if (!response.ok) {
        console.error('Failed to get user documents:', result.error)
        return []
      }

      return result.documents || []

    } catch (error) {
      console.error('Failed to get user documents:', error)
      return []
    }
  }

  async deleteDocument(pageId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const params = new URLSearchParams({
        pageId,
        userId
      })

      const response = await fetch(`${this.baseUrl}?${params}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Failed to delete document'
        }
      }

      return { success: true }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      }
    }
  }

  // Utility method to save document in multiple formats
  async saveDocumentMultiFormat(params: SaveDocumentParams): Promise<{
    success: boolean
    results: { [format: string]: { success: boolean; url?: string; error?: string } }
  }> {
    const formats: Array<'html' | 'json' | 'markdown'> = ['html', 'json', 'markdown']
    const results: { [format: string]: { success: boolean; url?: string; error?: string } } = {}

    let overallSuccess = true

    for (const format of formats) {
      const result = await this.saveDocument({ ...params, format })
      results[format] = result
      
      if (!result.success) {
        overallSuccess = false
      }
    }

    return {
      success: overallSuccess,
      results
    }
  }

  // Method to check if MinIO service is available
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch('/api/health')
      return response.ok
    } catch (error) {
      return false
    }
  }
}

// Export singleton instance
export const minioService = new MinIOService()