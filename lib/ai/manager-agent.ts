import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  retrieveContext,
  getConversationHistory,
} from "@/lib/memory/context-retrieval";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface ManagerAgentConfig {
  roomId: string;
  roomName?: string;
  projectName?: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Build system prompt for the Manager Agent persona
 */
function buildSystemPrompt(config: ManagerAgentConfig): string {
  return `You are Morph, an autonomous AI project and engineering manager. Your role is to:

1. **Manage Workflows**: Help coordinate tasks, track progress, and ensure team alignment
2. **Facilitate Decisions**: Guide discussions toward clear, actionable decisions
3. **Assign Tasks**: Identify actionable items and help organize work
4. **Communicate Clearly**: Summarize discussions, decisions, and action items
5. **Provide Context**: Use available project documents and conversation history to give informed responses

**Your Communication Style**:
- Be professional but friendly
- Be concise and actionable
- Ask clarifying questions when needed
- Summarize key points periodically
- Focus on moving projects forward

**Current Context**:
${config.roomName ? `- Room: ${config.roomName}` : ""}
${config.projectName ? `- Project: ${config.projectName}` : ""}

Remember: You are acting as a manager, not just a chatbot. Help the team make progress, not just answer questions.`;
}

/**
 * Format context chunks for the prompt
 */
function formatContext(
  contexts: Array<{ chunk_text: string; similarity: number }>
): string {
  if (contexts.length === 0) {
    return "**Note**: No relevant documents were found in this room. Please upload documents to enable document-based context.";
  }

  const contextText = contexts
    .map((ctx, idx) => {
      const relevance = (ctx.similarity * 100).toFixed(1);
      return `[Document Chunk ${idx + 1} - Relevance: ${relevance}%]\n${
        ctx.chunk_text
      }`;
    })
    .join("\n\n---\n\n");

  return `**Relevant Context from Uploaded Documents** (${contexts.length} chunks found):

${contextText}

**Instructions**: Use the above document context to answer the user's question. If the context is relevant, reference it directly. If the context doesn't contain the answer, say so clearly.`;
}

/**
 * Generate AI response using Gemini with RAG
 */
export async function generateManagerResponse(
  userMessage: string,
  config: ManagerAgentConfig
): Promise<string> {
  try {
    // Retrieve relevant context from documents
    // Lower threshold to 0.5 for better retrieval, get more chunks
    const contexts = await retrieveContext(userMessage, config.roomId, 10, 0.5);

    // Get recent conversation history
    const history = await getConversationHistory(config.roomId, 10);

    // Build system prompt
    const systemPrompt = buildSystemPrompt(config);
    const contextText = formatContext(contexts);

    // Build the full prompt with system instructions and context
    const conversationHistory = history
      .slice(-8)
      .map((m) => `${m.role === "user" ? "User" : "Manager"}: ${m.content}`)
      .join("\n");

    const fullPrompt = `${systemPrompt}

${contextText}

${conversationHistory ? `Conversation History:\n${conversationHistory}\n` : ""}

User: ${userMessage}

Manager:`;

    // Get Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    // Generate response
    const result = await model.generateContent(fullPrompt);
    const response = result.response.text();

    return response;
  } catch (error: any) {
    console.error("Error generating manager response:", error);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}

/**
 * Stream AI response (for real-time feel)
 */
export async function* streamManagerResponse(
  userMessage: string,
  config: ManagerAgentConfig
): AsyncGenerator<string, void, unknown> {
  try {
    // Retrieve relevant context
    const contexts = await retrieveContext(userMessage, config.roomId, 5, 0.7);
    const history = await getConversationHistory(config.roomId, 10);

    const systemPrompt = buildSystemPrompt(config);
    const contextText = formatContext(contexts);

    const conversationHistory = history
      .slice(-8)
      .map((m) => `${m.role === "user" ? "User" : "Manager"}: ${m.content}`)
      .join("\n");

    // Build the full prompt
    const fullPrompt = `${systemPrompt}

${contextText}

${conversationHistory ? `Conversation History:\n${conversationHistory}\n` : ""}

User: ${userMessage}

Manager:`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    // Note: Gemini streaming might need different implementation
    // For now, we'll return the full response
    const result = await model.generateContent(fullPrompt);
    const response = result.response.text();

    // Simulate streaming by yielding chunks
    const words = response.split(" ");
    for (const word of words) {
      yield word + " ";
      // Small delay for streaming effect
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  } catch (error: any) {
    console.error("Error streaming manager response:", error);
    throw new Error(`Failed to stream response: ${error.message}`);
  }
}
