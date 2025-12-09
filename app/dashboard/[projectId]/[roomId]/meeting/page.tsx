"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MeetingSidebar from "@/components/MeetingSidebar";
import VoiceControls from "@/components/VoiceControls";
import AIVoiceOutput from "@/components/AIVoiceOutput";

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

    // Get AI response (Phase 3 will implement full AI logic)
    // For now, we'll use a placeholder response
    const aiResponse = await getAIResponse(text);

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
  };

  const getAIResponse = async (userInput: string): Promise<string> => {
    // Placeholder - Phase 3 will implement full AI integration
    // For now, return a simple acknowledgment
    return `I understand you said: "${userInput}". This is a placeholder response. Full AI integration will be implemented in Phase 3.`;
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
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
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Developer View */}
        <div className="flex-1 flex flex-col bg-white border-r border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Developer View
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Your voice input and conversation
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
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
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - AI Manager View */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-indigo-50 to-purple-50">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  AI Manager
                </h2>
                <p className="text-sm text-gray-600">Morph Assistant</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {messages
                .filter((m) => m.role === "assistant")
                .map((message, index, filteredMessages) => {
                  const isLatest = index === filteredMessages.length - 1;
                  return (
                    <div
                      key={message.id}
                      className="bg-white rounded-lg p-4 shadow-sm"
                    >
                      <p className="text-gray-900 mb-2">{message.content}</p>
                      {isLatest && (
                        <AIVoiceOutput
                          text={message.content}
                          isSpeaking={isAISpeaking}
                          onSpeakingChange={setIsAISpeaking}
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Tasks and Decisions */}
        <MeetingSidebar roomId={roomId} />
      </div>

      {/* Bottom Voice Controls */}
      <VoiceControls
        onTranscript={handleTranscript}
        isListening={isListening}
        onListeningChange={setIsListening}
      />
    </div>
  );
}
