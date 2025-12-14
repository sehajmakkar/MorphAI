import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateManagerResponse } from "@/lib/ai/manager-agent";
import { summarizeConversation, storeSummaryItems } from "@/lib/ai/summarizer";

// Note: Edge runtime may have limitations with some imports
// If you encounter issues, remove this line to use Node.js runtime
// export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message, roomId, turnCount } = body;

    if (!message || !roomId) {
      return NextResponse.json(
        { error: "Message and roomId are required" },
        { status: 400 }
      );
    }

    // Get room and project info
    const { data: room } = await supabase
      .from("rooms")
      .select("*, projects!inner(name)")
      .eq("id", roomId)
      .single();

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Generate AI response
    const config = {
      roomId,
      roomName: room.name,
      projectName: (room.projects as any).name,
    };

    const aiResponse = await generateManagerResponse(message, config);

    // Check if we should summarize (every 5 turns)
    const shouldSummarize = turnCount && turnCount % 5 === 0;

    if (shouldSummarize) {
      try {
        const summary = await summarizeConversation(roomId, 5);
        await storeSummaryItems(roomId, user.id, summary);
      } catch (summaryError) {
        console.error("Error during summarization:", summaryError);
        // Don't fail the request if summarization fails
      }
    }

    return NextResponse.json({
      response: aiResponse,
      summarized: shouldSummarize,
    });
  } catch (error: any) {
    console.error("Error in AI chat:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
