import { NextRequest, NextResponse } from "next/server";

const MURF_API_URL = "https://api.murf.ai/v1/speech/generate";
const MURF_API_KEY = process.env.MURF_API_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!MURF_API_KEY) {
      return NextResponse.json(
        { error: "MurfAI API key is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { text, voiceId } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Default voice ID for AI Manager - can be customized
    const selectedVoiceId = voiceId || "en-US-natalie"; // Professional female voice
    // Alternative voices: 'en-US-julia', 'en-US-josh', 'en-US-michael', etc.

    const response = await fetch(MURF_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": MURF_API_KEY,
      },
      body: JSON.stringify({
        text: text,
        voiceId: selectedVoiceId,
        format: "MP3",
        channelType: "MONO",
        sampleRate: 44100,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("MurfAI API error:", errorText);
      return NextResponse.json(
        { error: "Failed to generate speech", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // The API returns an audioFile URL that's valid for 72 hours
    return NextResponse.json({
      audioUrl: data.audioFile,
      characterCount: data.characterCount,
      duration: data.duration,
    });
  } catch (error: any) {
    console.error("Error in MurfAI TTS API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
