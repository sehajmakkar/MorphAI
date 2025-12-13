"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MeetingSidebar from "@/components/MeetingSidebar";
import VoiceControls from "@/components/VoiceControls";
import AIVoiceOutput from "@/components/AIVoiceOutput";
import RobotIcon from "@/components/RobotIcon";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function MeetingPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const roomId = params.roomId as string;
  const supabase = createClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [currentAIResponse, setCurrentAIResponse] = useState("");
  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(true);
  const [turnCount, setTurnCount] = useState(0);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [initialHistoryMessageIds, setInitialHistoryMessageIds] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    fetchRoomInfo();
    fetchConversationHistory();
  }, [roomId]);

  const fetchRoomInfo = async () => {
    const { data } = await supabase
      .from("rooms")
      .select("name")
      .eq("id", roomId)
      .single();

    if (data) {
      setRoomName(data.name);
    }
  };

  const fetchConversationHistory = async () => {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (data) {
      const history: Message[] = data.map((conv) => ({
        id: conv.id,
        role: conv.role as "user" | "assistant",
        content: conv.message,
        timestamp: new Date(conv.created_at),
      }));
      setMessages(history);
      // Track initial history message IDs to distinguish from new messages
      setInitialHistoryMessageIds(new Set(history.map((m) => m.id)));
    }
    setLoading(false);
  };

  const handleTranscript = async (text: string) => {
    if (!text.trim()) return;

    // Add user message to UI
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Save to database
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("conversations").insert({
        room_id: roomId,
        user_id: user.id,
        message: text,
        role: "user",
      });
    }

    // Get AI response using real AI integration
    setIsLoadingAI(true);
    try {
      // Calculate new turn count but don't update state until API succeeds
      const newTurnCount = turnCount + 1;
      const aiResponse = await getAIResponse(text, newTurnCount);

      // Only increment turnCount after successful AI response
      setTurnCount(newTurnCount);

      // Add AI message to UI
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setCurrentAIResponse(""); // Clear after adding to messages

      // Save AI response to database
      if (user) {
        await supabase.from("conversations").insert({
          room_id: roomId,
          user_id: user.id,
          message: aiResponse,
          role: "assistant",
        });
      }

      // Refresh sidebar if summary was created (every 5 turns)
      if (newTurnCount % 5 === 0) {
        // Trigger a refresh by updating a timestamp or using a state update
        // The sidebar will pick up new items via realtime subscriptions
      }
    } catch (error: any) {
      console.error("Error getting AI response:", error);
      // Show error message to user
      // Note: turnCount is NOT incremented on error, so failed requests don't advance the counter
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const getAIResponse = async (
    userInput: string,
    currentTurnCount: number
  ): Promise<string> => {
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userInput,
          roomId: roomId,
          turnCount: currentTurnCount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get AI response");
      }

      const data = await response.json();
      return data.response;
    } catch (error: any) {
      console.error("Error calling AI API:", error);
      throw error;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push(`/dashboard/${projectId}/${roomId}`)}
              className="text-sm text-indigo-600 hover:text-indigo-800 mb-1"
            >
              ← Back to Room
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Meeting: {roomName || "Loading..."}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isListening ? "bg-red-500 animate-pulse" : "bg-gray-400"
                }`}
              ></div>
              <span className="text-sm text-gray-600">
                {isListening ? "Recording" : "Idle"}
              </span>
            </div>
            {isLoadingAI && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">AI thinking...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Panel - Developer View */}
        <div className="flex-1 flex flex-col bg-white border-r border-gray-200 min-w-0">
          <div className="flex-shrink-0 p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Developer View
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Your voice input and conversation
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Loading conversation...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-gray-500 mb-2">
                    Start speaking to begin the meeting
                  </p>
                  <p className="text-sm text-gray-400">
                    Click the microphone button below to start
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === "user"
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p
                        className={`text-xs mt-2 ${
                          message.role === "user"
                            ? "text-indigo-200"
                            : "text-gray-500"
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {/* Auto-play AI voice for latest message */}
                {messages
                  .filter((m) => m.role === "assistant")
                  .map((message, index, filteredMessages) => {
                    const isLatest = index === filteredMessages.length - 1;
                    const shouldAutoPlay =
                      isLatest && !initialHistoryMessageIds.has(message.id);
                    return (
                      isLatest && (
                        <AIVoiceOutput
                          key={`voice-${message.id}`}
                          text={message.content}
                          isSpeaking={isAISpeaking}
                          onSpeakingChange={setIsAISpeaking}
                          autoPlay={shouldAutoPlay}
                        />
                      )
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Robot Icon View */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-indigo-50 to-purple-50 min-w-0">
          <div className="flex-shrink-0 p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              AI Assistant
            </h2>
            <p className="text-sm text-gray-600">Morph Assistant</p>
          </div>

          <div className="flex-1 flex items-center justify-center p-6 min-h-0">
            <RobotIcon isSpeaking={isAISpeaking} />
          </div>
        </div>

        {/* Right Sidebar - Tasks and Decisions */}
        <div className="flex-shrink-0">
          <MeetingSidebar roomId={roomId} />
        </div>
      </div>

      {/* Bottom Voice Controls */}
      <div className="flex-shrink-0">
        <VoiceControls
          onTranscript={handleTranscript}
          isListening={isListening}
          onListeningChange={setIsListening}
        />
      </div>
    </div>
  );
}
