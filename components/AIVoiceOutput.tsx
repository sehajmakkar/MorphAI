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
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!text || !autoPlay) return;

    // Cancel any ongoing speech
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Abort any ongoing fetch requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const generateAndPlaySpeech = async () => {
      try {
        setIsLoading(true);

        // Call our API route to generate speech using MurfAI
        const response = await fetch("/api/tts/murf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to generate speech");
        }

        const data = await response.json();
        const audioUrl = data.audioUrl;

        if (!audioUrl) {
          throw new Error("No audio URL returned from API");
        }

        // Create audio element and play
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onplay = () => {
          onSpeakingChange(true);
        };

        audio.onended = () => {
          onSpeakingChange(false);
          audioRef.current = null;
          setIsLoading(false);
        };

        audio.onerror = (event) => {
          console.error("Audio playback error:", event);
          onSpeakingChange(false);
          audioRef.current = null;
          setIsLoading(false);
        };

        audio.onpause = () => {
          onSpeakingChange(false);
        };

        // Play the audio
        await audio.play();
      } catch (error: any) {
        // Ignore abort errors
        if (error.name === "AbortError") {
          return;
        }

        console.error("Error generating or playing speech:", error);
        onSpeakingChange(false);
        setIsLoading(false);

        // Optionally, you could fall back to browser TTS here if MurfAI fails
        // For now, we'll just log the error
      }
    };

    generateAndPlaySpeech();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        onSpeakingChange(false);
      }
    };
  }, [text, autoPlay, onSpeakingChange]);

  // Component only handles audio, no visual output
  return null;
}
