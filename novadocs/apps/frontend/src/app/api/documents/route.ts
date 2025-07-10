// app/api/documents/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'minio'

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

// Initialize MinIO client
const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
})

const DOCUMENTS_BUCKET = 'novadocs-documents'
const METADATA_BUCKET = 'novadocs-metadata'

// Initialize buckets
async function initializeBuckets() {
  try {
    const documentsExists = await minioClient.bucketExists(DOCUMENTS_BUCKET)
    if (!documentsExists) {
      await minioClient.makeBucket(DOCUMENTS_BUCKET, 'us-east-1')
    }

    const metadataExists = await minioClient.bucketExists(METADATA_BUCKET)
    if (!metadataExists) {
      await minioClient.makeBucket(METADATA_BUCKET, 'us-east-1')
    }
  } catch (error) {
    console.error('Failed to initialize buckets:', error)
  }
}

// POST - Save document
export async function POST(request: NextRequest) {
  try {
    await initializeBuckets()
    
    const body = await request.json()
    const { pageId, title, content, userId, format = 'html' } = body

    if (!pageId || !title || !content || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const timestamp = new Date().toISOString()
    const fileName = `${userId}/${pageId}.${format}`
    const metadataFileName = `${userId}/${pageId}.metadata.json`

    // Get existing metadata to increment version
    let version = 1
    try {
      const existingMetadataStream = await minioClient.getObject(METADATA_BUCKET, metadataFileName)
      const chunks: Buffer[] = []
      
      await new Promise((resolve, reject) => {
        existingMetadataStream.on('data', (chunk) => chunks.push(chunk))
        existingMetadataStream.on('end', resolve)
        existingMetadataStream.on('error', reject)
      })

      const existingMetadata = JSON.parse(Buffer.concat(chunks).toString())
      version = existingMetadata.version + 1
    } catch (error) {
      // Metadata doesn't exist yet, use version 1
    }

    // Prepare document content based on format
    let documentContent: string
    let contentType: string

    switch (format) {
      case 'json':
        documentContent = JSON.stringify({
          pageId,
          title,
          content,
          userId,
          createdAt: timestamp,
          format
        }, null, 2)
        contentType = 'application/json'
        break
      case 'markdown':
        documentContent = htmlToMarkdown(content)
        contentType = 'text/markdown'
        break
      default: // html
        documentContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <meta name="author" content="${userId}">
    <meta name="created" content="${timestamp}">
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
    <div class="content">
        ${content}
    </div>
    <hr>
    <small>Created: ${timestamp} | Document ID: ${pageId}</small>
</body>
</html>`
        contentType = 'text/html'
    }

    // Create metadata object
    const metadata: DocumentMetadata = {
      id: pageId,
      title,
      userId,
      createdAt: version === 1 ? timestamp : await getCreatedDate(pageId, userId) || timestamp,
      updatedAt: timestamp,
      size: documentContent.length,
      format,
      version
    }

    // Save document content
    await minioClient.putObject(
      DOCUMENTS_BUCKET,
      fileName,
      Buffer.from(documentContent),
      documentContent.length,
      {
        'Content-Type': contentType,
        'X-Document-Title': title,
        'X-User-ID': userId,
        'X-Document-Version': version.toString()
      }
    )

    // Save metadata
    await minioClient.putObject(
      METADATA_BUCKET,
      metadataFileName,
      Buffer.from(JSON.stringify(metadata, null, 2)),
      JSON.stringify(metadata).length,
      { 'Content-Type': 'application/json' }
    )

    // Generate URL for the saved document
    const url = await minioClient.presignedGetObject(DOCUMENTS_BUCKET, fileName, 24 * 60 * 60) // 24 hours

    return NextResponse.json({
      success: true,
      url,
      metadata
    })

  } catch (error) {
    console.error('Failed to save document:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET - Retrieve document or list documents
export async function GET(request: NextRequest) {
  try {
    await initializeBuckets()
    
    const { searchParams } = new URL(request.url)
    const pageId = searchParams.get('pageId')
    const userId = searchParams.get('userId')
    const format = searchParams.get('format') || 'html'
    const list = searchParams.get('list') === 'true'

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    if (list) {
      // List all documents for user
      const documents: DocumentMetadata[] = []
      const stream = minioClient.listObjects(METADATA_BUCKET, `${userId}/`, true)

      await new Promise((resolve, reject) => {
        stream.on('data', async (obj) => {
          if (obj.name?.endsWith('.metadata.json')) {
            try {
              const metadataStream = await minioClient.getObject(METADATA_BUCKET, obj.name)
              const chunks: Buffer[] = []
              
              await new Promise((resolve) => {
                metadataStream.on('data', (chunk) => chunks.push(chunk))
                metadataStream.on('end', resolve)
              })

              const metadata = JSON.parse(Buffer.concat(chunks).toString())
              documents.push(metadata)
            } catch (error) {
              console.error('Error reading metadata:', error)
            }
          }
        })

        stream.on('end', resolve)
        stream.on('error', reject)
      })

      // Sort by updatedAt descending
      documents.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

      return NextResponse.json({
        success: true,
        documents
      })
    }

    if (!pageId) {
      return NextResponse.json(
        { success: false, error: 'pageId is required for single document retrieval' },
        { status: 400 }
      )
    }

    // Get single document
    const fileName = `${userId}/${pageId}.${format}`
    
    try {
      const stream = await minioClient.getObject(DOCUMENTS_BUCKET, fileName)
      const chunks: Buffer[] = []
      
      await new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk))
        stream.on('end', resolve)
        stream.on('error', reject)
      })

      const content = Buffer.concat(chunks).toString()
      const metadata = await getDocumentMetadata(pageId, userId)

      return NextResponse.json({
        success: true,
        content,
        metadata
      })

    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

  } catch (error) {
    console.error('Failed to retrieve document:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete document
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pageId = searchParams.get('pageId')
    const userId = searchParams.get('userId')

    if (!pageId || !userId) {
      return NextResponse.json(
        { success: false, error: 'pageId and userId are required' },
        { status: 400 }
      )
    }

    const formats = ['html', 'json', 'markdown']
    
    // Delete all format versions
    for (const format of formats) {
      try {
        await minioClient.removeObject(DOCUMENTS_BUCKET, `${userId}/${pageId}.${format}`)
      } catch (error) {
        // File might not exist in this format, continue
      }
    }

    // Delete metadata
    await minioClient.removeObject(METADATA_BUCKET, `${userId}/${pageId}.metadata.json`)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to delete document:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Helper functions
async function getDocumentMetadata(pageId: string, userId: string): Promise<DocumentMetadata | null> {
  try {
    const metadataFileName = `${userId}/${pageId}.metadata.json`
    const stream = await minioClient.getObject(METADATA_BUCKET, metadataFileName)
    
    const chunks: Buffer[] = []
    await new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk))
      stream.on('end', resolve)
      stream.on('error', reject)
    })

    return JSON.parse(Buffer.concat(chunks).toString())
  } catch (error) {
    return null
  }
}

async function getCreatedDate(pageId: string, userId: string): Promise<string | null> {
  const metadata = await getDocumentMetadata(pageId, userId)
  return metadata?.createdAt || null
}

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/g, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/g, '*$1*')
    .replace(/<code[^>]*>(.*?)<\/code>/g, '`$1`')
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/g, '> $1\n')
    .replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
    .trim()
}