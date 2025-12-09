"use client";

import { useEffect, useRef, useState } from "react";

interface AIVoiceOutputProps {
  text: string;
  isSpeaking: boolean;
  onSpeakingChange: (speaking: boolean) => void;
}

export default function AIVoiceOutput({
  text,
  isSpeaking,
  onSpeakingChange,
}: AIVoiceOutputProps) {
  const [currentText, setCurrentText] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setIsSupported(true);
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  useEffect(() => {
    if (!text || !isSupported || !synthRef.current) return;

    // Cancel any ongoing speech
    if (synthRef.current.speaking) {
      synthRef.current.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to use a more natural voice if available
    const voices = synthRef.current.getVoices();
    const preferredVoice =
      voices.find(
        (v) => v.name.includes("Google") || v.name.includes("Natural")
      ) || voices.find((v) => v.lang.startsWith("en"));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      onSpeakingChange(true);
      setCurrentText(text);
    };

    utterance.onend = () => {
      onSpeakingChange(false);
      setCurrentText("");
    };

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      onSpeakingChange(false);
      setCurrentText("");
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);

    return () => {
      if (synthRef.current?.speaking) {
        synthRef.current.cancel();
      }
    };
  }, [text, isSupported, onSpeakingChange]);

  // Load voices when they become available
  useEffect(() => {
    if (!synthRef.current) return;

    const loadVoices = () => {
      // Voices might not be loaded immediately
      const voices = synthRef.current?.getVoices();
      if (voices && voices.length > 0) {
        // Voices loaded
      }
    };

    loadVoices();
    synthRef.current.onvoiceschanged = loadVoices;
  }, []);

  return (
    <div className="relative">
      {isSpeaking && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex space-x-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-2 h-8 bg-indigo-500 rounded-full animate-pulse"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: "0.6s",
                }}
              ></div>
            ))}
          </div>
        </div>
      )}
      {currentText && (
        <div className="text-gray-700 text-sm opacity-75">{currentText}</div>
      )}
    </div>
  );
}
