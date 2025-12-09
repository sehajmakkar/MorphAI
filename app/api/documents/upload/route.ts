import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import pdfParse from 'pdf-parse'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// Text chunking function
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    let chunk = text.slice(start, end)

    // Try to break at sentence boundaries
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.')
      const lastNewline = chunk.lastIndexOf('\n')
      const breakPoint = Math.max(lastPeriod, lastNewline)

      if (breakPoint > chunkSize * 0.5) {
        chunk = text.slice(start, start + breakPoint + 1)
        start += breakPoint + 1 - overlap
      } else {
        start = end - overlap
      }
    } else {
      start = end
    }

    chunks.push(chunk.trim())
  }

  return chunks.filter((chunk) => chunk.length > 0)
}

// Generate embeddings using Gemini
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Try text-embedding-004 first, fallback to embedding-001
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })
    const result = await model.embedContent(text)
    return result.embedding.values
  } catch (error: any) {
    // Fallback to embedding-001 if text-embedding-004 doesn't exist
    if (error.message?.includes('model') || error.message?.includes('404')) {
      try {
        const model = genAI.getGenerativeModel({ model: 'embedding-001' })
        const result = await model.embedContent(text)
        return result.embedding.values
      } catch (fallbackError) {
        console.error('Error generating embedding with fallback:', fallbackError)
        throw fallbackError
      }
    }
    console.error('Error generating embedding:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const roomId = formData.get('roomId') as string

    if (!file || !roomId) {
      return NextResponse.json(
        { error: 'File and roomId are required' },
        { status: 400 }
      )
    }

    // Verify room access
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*, projects!inner(*)')
      .eq('id', roomId)
      .eq('projects.user_id', user.id)
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Extract text from file
    let text = ''
    const fileType = file.name.split('.').pop()?.toLowerCase() || ''

    if (fileType === 'pdf') {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const pdfData = await pdfParse(buffer)
      text = pdfData.text
    } else if (fileType === 'txt' || fileType === 'md') {
      text = await file.text()
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      )
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: 'File appears to be empty' },
        { status: 400 }
      )
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${roomId}/${Date.now()}.${fileExt}`
    const filePath = `documents/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      )
    }

    // Create document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        room_id: roomId,
        file_path: filePath,
        file_type: fileType,
        file_name: file.name,
        file_size: file.size,
      })
      .select()
      .single()

    if (docError || !document) {
      // Clean up uploaded file
      await supabase.storage.from('documents').remove([filePath])
      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 }
      )
    }

    // Chunk text and generate embeddings
    const chunks = chunkText(text)
    const embeddings = []

    for (let i = 0; i < chunks.length; i++) {
      try {
        const embedding = await generateEmbedding(chunks[i])
        embeddings.push({
          document_id: document.id,
          chunk_text: chunks[i],
          embedding: embedding, // Supabase pgvector expects array format
          chunk_index: i,
          metadata: {
            file_name: file.name,
            chunk_length: chunks[i].length,
          },
        })
      } catch (error) {
        console.error(`Error processing chunk ${i}:`, error)
        // Continue with other chunks
      }
    }

    // Insert embeddings in batches
    if (embeddings.length > 0) {
      const { error: embedError } = await supabase
        .from('embeddings')
        .insert(embeddings)

      if (embedError) {
        console.error('Embedding insert error:', embedError)
        // Document is still created, but embeddings failed
      }
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        file_name: document.file_name,
        chunks_processed: embeddings.length,
      },
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

