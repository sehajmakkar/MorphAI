"use client";

import { useState, useEffect, useRef } from "react";

interface VoiceControlsProps {
  onTranscript: (text: string) => void;
  isListening: boolean;
  onListeningChange: (listening: boolean) => void;
}

export default function VoiceControls({
  onTranscript,
  isListening,
  onListeningChange,
}: VoiceControlsProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Check if browser supports Web Speech API
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setError("Your browser does not support speech recognition");
      return;
    }

    setIsSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setError(null);
      onListeningChange(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        onTranscript(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "no-speech") {
        setError("No speech detected. Please try again.");
      } else if (event.error === "audio-capture") {
        setError("No microphone found. Please check your microphone.");
      } else if (event.error === "not-allowed") {
        setError(
          "Microphone permission denied. Please allow microphone access."
        );
        onListeningChange(false);
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      onListeningChange(false);
      // Restart if it was listening (continuous mode)
      if (isListening) {
        try {
          recognition.start();
        } catch (e) {
          // Already started or other error
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (!recognitionRef.current || !isSupported) return;

    if (isListening) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Already started
      }
    } else {
      recognitionRef.current.stop();
    }
  }, [isListening, isSupported]);

  const toggleListening = () => {
    if (!isSupported) {
      setError("Speech recognition is not supported in your browser");
      return;
    }
    onListeningChange(!isListening);
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <div className="max-w-4xl mx-auto">
        {error && (
          <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
            {error}
          </div>
        )}

        {!isSupported && (
          <div className="mb-3 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded text-sm">
            Speech recognition is not supported in your browser. Please use
            Chrome, Edge, or Safari.
          </div>
        )}

        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={toggleListening}
            disabled={!isSupported}
            className={`relative flex items-center justify-center w-16 h-16 rounded-full transition-all ${
              isListening
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : "bg-indigo-600 hover:bg-indigo-700"
            } ${!isSupported ? "opacity-50 cursor-not-allowed" : ""}`}
            title={isListening ? "Stop listening" : "Start listening"}
          >
            {isListening ? (
              <>
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zM5 9a1 1 0 011-1h1a1 1 0 110 2H6a1 1 0 01-1-1zm9-1a1 1 0 011 1v1a1 1 0 11-2 0V9a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></span>
              </>
            ) : (
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>

          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <div
                className={`flex-1 h-2 bg-gray-200 rounded-full overflow-hidden ${
                  isListening ? "" : "opacity-50"
                }`}
              >
                <div
                  className={`h-full bg-indigo-600 rounded-full transition-all ${
                    isListening ? "animate-pulse" : ""
                  }`}
                  style={{
                    width: isListening ? "100%" : "0%",
                  }}
                ></div>
              </div>
              <span className="text-sm text-gray-600 min-w-[100px]">
                {isListening ? "Listening..." : "Microphone off"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any)
    | null;
  onerror:
    | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any)
    | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
