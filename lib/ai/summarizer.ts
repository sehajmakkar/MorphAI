import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface SummaryItem {
  type: "decision" | "task" | "action_point" | "question";
  content: string;
  reasoning?: string;
  metadata?: Record<string, any>;
}

export interface ConversationSummary {
  decisions: SummaryItem[];
  tasks: SummaryItem[];
  actionPoints: SummaryItem[];
  questions: SummaryItem[];
}

/**
 * Summarize conversation and extract key items
 */
export async function summarizeConversation(
  roomId: string,
  conversationTurns: number = 5
): Promise<ConversationSummary> {
  try {
    const supabase = await createClient();

    // Get recent conversations
    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(conversationTurns * 2); // User + assistant pairs

    if (error || !conversations || conversations.length === 0) {
      return {
        decisions: [],
        tasks: [],
        actionPoints: [],
        questions: [],
      };
    }

    // Format conversation for summarization
    const conversationText = conversations
      .reverse()
      .map(
        (conv) =>
          `${conv.role === "user" ? "User" : "Manager"}: ${conv.message}`
      )
      .join("\n\n");

    // Create prompt for summarization
    const prompt = `Analyze the following conversation and extract key information. Format your response as JSON with the following structure:

{
  "decisions": [
    {
      "content": "What was decided",
      "reasoning": "Why this decision was made"
    }
  ],
  "tasks": [
    {
      "content": "Actionable task description",
      "metadata": {
        "priority": "high|medium|low",
        "estimated_effort": "description if mentioned"
      }
    }
  ],
  "action_points": [
    {
      "content": "Follow-up action needed"
    }
  ],
  "questions": [
    {
      "content": "Unresolved question"
    }
  ]
}

Only include items that are clearly present in the conversation. If a category has no items, use an empty array.

Conversation:
${conversationText}

Respond with ONLY valid JSON, no additional text.`;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Parse JSON response
    let parsed: any;
    try {
      // Try to extract JSON from response (in case there's extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(response);
      }
    } catch (parseError) {
      console.error("Error parsing summary JSON:", parseError);
      return {
        decisions: [],
        tasks: [],
        actionPoints: [],
        questions: [],
      };
    }

    // Transform to our format
    const summary: ConversationSummary = {
      decisions: (parsed.decisions || []).map((item: any) => ({
        type: "decision" as const,
        content: item.content,
        reasoning: item.reasoning,
      })),
      tasks: (parsed.tasks || []).map((item: any) => ({
        type: "task" as const,
        content: item.content,
        metadata: item.metadata,
      })),
      actionPoints: (parsed.action_points || []).map((item: any) => ({
        type: "action_point" as const,
        content: item.content,
      })),
      questions: (parsed.questions || []).map((item: any) => ({
        type: "question" as const,
        content: item.content,
      })),
    };

    return summary;
  } catch (error: any) {
    console.error("Error summarizing conversation:", error);
    return {
      decisions: [],
      tasks: [],
      actionPoints: [],
      questions: [],
    };
  }
}

/**
 * Store summary items in database
 */
export async function storeSummaryItems(
  roomId: string,
  userId: string,
  summary: ConversationSummary
): Promise<void> {
  const supabase = await createClient();

  const itemsToStore: Array<{
    room_id: string;
    user_id: string;
    message: string;
    role: string;
    summary_type: string;
  }> = [];

  // Store decisions
  summary.decisions.forEach((decision) => {
    itemsToStore.push({
      room_id: roomId,
      user_id: userId,
      message: decision.reasoning
        ? `Decision: ${decision.content}\nReasoning: ${decision.reasoning}`
        : `Decision: ${decision.content}`,
      role: "system",
      summary_type: "decision",
    });
  });

  // Store action points
  summary.actionPoints.forEach((actionPoint) => {
    itemsToStore.push({
      room_id: roomId,
      user_id: userId,
      message: `Action Point: ${actionPoint.content}`,
      role: "system",
      summary_type: "action_point",
    });
  });

  // Store questions
  summary.questions.forEach((question) => {
    itemsToStore.push({
      room_id: roomId,
      user_id: userId,
      message: `Question: ${question.content}`,
      role: "system",
      summary_type: "question",
    });
  });

  // Tasks will be stored separately in Phase 4
  // For now, we'll store them as conversations with summary_type='task'
  summary.tasks.forEach((task) => {
    itemsToStore.push({
      room_id: roomId,
      user_id: userId,
      message: `Task: ${task.content}`,
      role: "system",
      summary_type: "task",
    });
  });

  if (itemsToStore.length > 0) {
    const { error } = await supabase.from("conversations").insert(itemsToStore);
    if (error) {
      console.error("Error storing summary items:", error);
    }
  }
}
