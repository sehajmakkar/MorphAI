"use client";

interface RobotIconProps {
  isSpeaking: boolean;
}

export default function RobotIcon({ isSpeaking }: RobotIconProps) {
  return (
    <div className="relative flex items-center justify-center h-full">
      {/* Robot Icon */}
      <div className="relative">
        <svg
          className={`w-32 h-32 text-indigo-600 transition-all duration-300 ${
            isSpeaking ? "scale-110" : "scale-100"
          }`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          {/* Robot Head */}
          <rect x="6" y="4" width="12" height="10" rx="2" />
          {/* Robot Eyes */}
          <circle cx="9" cy="8" r="1.5" fill="white" />
          <circle cx="15" cy="8" r="1.5" fill="white" />
          {/* Robot Mouth */}
          <rect x="10" y="11" width="4" height="1.5" rx="0.5" fill="white" />
          {/* Robot Antenna */}
          <circle cx="12" cy="4" r="1" />
          <line x1="12" y1="3" x2="12" y2="1" stroke="currentColor" strokeWidth="1.5" />
        </svg>

        {/* Ripple Effect Animation - Only visible when speaking */}
        {isSpeaking && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="absolute rounded-full border-2 border-indigo-500"
                style={{
                  width: '64px',
                  height: '64px',
                  animation: `ripple 2s ease-out infinite`,
                  animationDelay: `${i * 0.5}s`,
                  opacity: 0.6,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* CSS Animation for ripple effect */}
      <style jsx>{`
        @keyframes ripple {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

