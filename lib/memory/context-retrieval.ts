import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/ai/embeddings'

export interface RetrievedContext {
  chunk_text: string
  similarity: number
  metadata?: any
}

/**
 * Retrieve relevant context from vector store using RAG
 */
export async function retrieveContext(
  query: string,
  roomId: string,
  limit: number = 5,
  threshold: number = 0.5 // Lowered threshold for better retrieval
): Promise<RetrievedContext[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query)

    const supabase = await createClient()

    // First, verify we have embeddings in this room
    const { data: docCheck } = await supabase
      .from('documents')
      .select('id')
      .eq('room_id', roomId)
      .limit(1)

    if (!docCheck || docCheck.length === 0) {
      console.log(`No documents found in room ${roomId}`)
      return []
    }

    // Check if embeddings exist for documents in this room
    const { data: embeddingCheck } = await supabase
      .from('embeddings')
      .select('id')
      .in('document_id', docCheck.map(d => d.id))
      .limit(1)

    if (!embeddingCheck || embeddingCheck.length === 0) {
      console.log(`No embeddings found for documents in room ${roomId}`)
      return []
    }

    // Try RPC first, but use fallback if it fails (more reliable)
    // The RPC might have issues with vector type conversion
    let data: any[] | null = null
    let rpcError: any = null

    try {
      // Format embedding as PostgreSQL array string for vector type
      const embeddingArrayStr = `[${queryEmbedding.join(',')}]`
      
      const { data: rpcData, error: rpcErr } = await supabase.rpc('match_embeddings', {
        query_embedding: embeddingArrayStr,
        match_threshold: threshold,
        match_count: limit,
        filter_room_id: roomId,
      })

      if (!rpcErr && rpcData) {
        data = rpcData
        console.log(`RPC: Retrieved ${rpcData.length} context chunks for room ${roomId}`)
      } else {
        rpcError = rpcErr
        console.log('RPC failed, using fallback method:', rpcErr?.message)
      }
    } catch (rpcException) {
      console.log('RPC exception, using fallback method:', rpcException)
      rpcError = rpcException
    }

    // Use fallback method if RPC failed or returned no results
    if (!data || data.length === 0) {
      console.log('Using fallback context retrieval method')
      const fallbackResults = await fallbackContextRetrieval(supabase, queryEmbedding, roomId, limit, threshold)
      
      if (fallbackResults.length > 0) {
        console.log(`Fallback: Retrieved ${fallbackResults.length} context chunks for room ${roomId}`)
        return fallbackResults
      }

      // Try with lower threshold if no results
      if (threshold > 0.3) {
        console.log(`No results with threshold ${threshold}, trying with 0.3`)
        return await retrieveContext(query, roomId, limit, 0.3)
      }

      console.log(`No context found for room ${roomId} even with low threshold`)
      return []
    }

    return (data || []).map((item: any) => ({
      chunk_text: item.chunk_text,
      similarity: item.similarity,
      metadata: item.metadata,
    }))
  } catch (error) {
    console.error('Error in context retrieval:', error)
    return []
  }
}

/**
 * Fallback context retrieval using direct SQL query
 */
async function fallbackContextRetrieval(
  supabase: any,
  queryEmbedding: number[],
  roomId: string,
  limit: number,
  threshold: number
): Promise<RetrievedContext[]> {
  try {
    // Get all embeddings for documents in this room using a join
    const { data: embeddings, error } = await supabase
      .from('embeddings')
      .select(`
        id,
        chunk_text,
        embedding,
        metadata,
        documents!inner(id, room_id)
      `)
      .eq('documents.room_id', roomId)
      .limit(200) // Get more to calculate similarity

    if (error) {
      console.error('Error fetching embeddings for fallback:', error)
      return []
    }

    if (!embeddings || embeddings.length === 0) {
      console.log(`No embeddings found in fallback query for room ${roomId}`)
      return []
    }

    console.log(`Fallback: Found ${embeddings.length} embeddings to process`)

    // Calculate cosine similarity manually
    const results = embeddings
      .map((emb: any) => {
        let embeddingArray: number[] = []
        
        // Handle different embedding formats
        if (Array.isArray(emb.embedding)) {
          embeddingArray = emb.embedding
        } else if (typeof emb.embedding === 'string') {
          // Parse string representation if needed
          try {
            embeddingArray = JSON.parse(emb.embedding)
          } catch {
            return null
          }
        } else {
          return null
        }

        if (embeddingArray.length !== queryEmbedding.length) {
          console.warn(`Embedding dimension mismatch: ${embeddingArray.length} vs ${queryEmbedding.length}`)
          return null
        }
        
        // Calculate cosine similarity
        const dotProduct = queryEmbedding.reduce((sum, val, i) => sum + val * (embeddingArray[i] || 0), 0)
        const queryMagnitude = Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0))
        const embMagnitude = Math.sqrt(embeddingArray.reduce((sum: number, val: number) => sum + val * val, 0))
        
        if (queryMagnitude === 0 || embMagnitude === 0) {
          return null
        }
        
        const similarity = dotProduct / (queryMagnitude * embMagnitude)

        return {
          chunk_text: emb.chunk_text,
          similarity: similarity,
          metadata: emb.metadata,
        }
      })
      .filter((item: any) => item && item.similarity >= threshold)
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, limit)

    console.log(`Fallback: Found ${results.length} results above threshold ${threshold}`)
    return results
  } catch (error) {
    console.error('Error in fallback context retrieval:', error)
    return []
  }
}

/**
 * Get conversation history for context
 */
export async function getConversationHistory(
  roomId: string,
  limit: number = 10
): Promise<Array<{ role: string; content: string }>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('conversations')
    .select('role, message')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching conversation history:', error)
    return []
  }

  // Reverse to get chronological order
  return (data || [])
    .reverse()
    .map((conv) => ({
      role: conv.role,
      content: conv.message,
    }))
}

