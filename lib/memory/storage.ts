import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/ai/embeddings'

/**
 * Store conversation summary in vector store for future retrieval
 */
export async function storeConversationSummary(
  roomId: string,
  summaryText: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const supabase = await createClient()

    // Generate embedding for the summary
    const embedding = await generateEmbedding(summaryText)

    // Get a document ID to associate with (or create a virtual one)
    // For summaries, we'll store them as special embeddings
    const { data: documents } = await supabase
      .from('documents')
      .select('id')
      .eq('room_id', roomId)
      .limit(1)
      .single()

    if (!documents) {
      // No document to associate with, skip vector storage
      return
    }

    // Store as embedding
    const { error } = await supabase.from('embeddings').insert({
      document_id: documents.id,
      chunk_text: summaryText,
      embedding: embedding,
      chunk_index: -1, // Special index for summaries
      metadata: {
        type: 'conversation_summary',
        ...metadata,
      },
    })

    if (error) {
      console.error('Error storing conversation summary:', error)
    }
  } catch (error) {
    console.error('Error in storeConversationSummary:', error)
  }
}

/**
 * Get room context summary
 */
export async function getRoomContext(roomId: string): Promise<string> {
  const supabase = await createClient()

  // Get recent summaries
  const { data: summaries } = await supabase
    .from('conversations')
    .select('message')
    .eq('room_id', roomId)
    .in('summary_type', ['decision', 'task', 'action_point'])
    .order('created_at', { ascending: false })
    .limit(10)

  if (!summaries || summaries.length === 0) {
    return 'No previous context available for this room.'
  }

  return summaries.map((s) => s.message).join('\n\n')
}

