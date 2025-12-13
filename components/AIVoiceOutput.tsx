"use client";

import { useEffect, useRef, useState } from "react";

interface AIVoiceOutputProps {
  text: string;
  isSpeaking: boolean;
  onSpeakingChange: (speaking: boolean) => void;
  autoPlay?: boolean; // If false, component will not automatically speak on mount/update
}

export default function AIVoiceOutput({
  text,
  isSpeaking,
  onSpeakingChange,
  autoPlay = false, // Default to false to prevent auto-playing historical messages
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
    if (!text || !isSupported || !synthRef.current || !autoPlay) return;

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
  }, [text, isSupported, onSpeakingChange, autoPlay]);

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

  // Component only handles audio, no visual output
  return null;
}
