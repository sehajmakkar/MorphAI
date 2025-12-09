import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Use the text-embedding-004 model (or embedding-001 if that doesn't work)
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

export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
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

