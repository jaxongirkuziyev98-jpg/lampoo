import React, { useEffect, useState } from 'react';
import type { LampoMood, LampoQuirk } from '../types/lesson';

interface LampoMascotProps {
  size?: number;
  mood?: LampoMood;
  quirk?: LampoQuirk;
  quirkKey?: number;
  isSpeaking?: boolean;
  isThinking?: boolean;
  showFloatingDot?: boolean;
  trackMouse?: boolean;
  onClick?: () => void;
  className?: string;
}

export const LampoMascot: React.FC<LampoMascotProps> = ({
  size = 76,
  mood = 'happy',
  quirk = 'none',
  quirkKey = 0,
  isSpeaking = false,
  isThinking = false,
  showFloatingDot = true,
  trackMouse = false,
  onClick,
  className = '',
}) => {
  const [blink, setBlink] = useState(false);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [speakPhase, setSpeakPhase] = useState(0);
  const [activeQuirk, setActiveQuirk] = useState<LampoQuirk>('none');

  // Natural blinking interval
  useEffect(() => {
    let timeoutId: number;
    const scheduleBlink = () => {
      const delay = 2400 + Math.random() * 2300;
      timeoutId = window.setTimeout(() => {
        setBlink(true);
        window.setTimeout(() => setBlink(false), 130);
        scheduleBlink();
      }, delay);
    };
    scheduleBlink();
    return () => window.clearTimeout(timeoutId);
  }, []);

  // Subtle mouse tracking on home / chat screen
  useEffect(() => {
    if (!trackMouse) {
      setEyeOffset({ x: 0, y: 0 });
      return;
    }
    const handleMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2.6;
      const dx = (e.clientX - cx) / Math.max(window.innerWidth / 2, 1);
      const dy = (e.clientY - cy) / Math.max(window.innerHeight / 2, 1);
      setEyeOffset({
        x: Math.max(-3.2, Math.min(3.2, dx * 3.5)),
        y: Math.max(-2.5, Math.min(2.5, dy * 3)),
      });
    };
    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMove);
  }, [trackMouse]);

  // Speaking mouth animation
  useEffect(() => {
    if (!isSpeaking) {
      setSpeakPhase(0);
      return;
    }
    const id = window.setInterval(() => {
      setSpeakPhase((p) => (p + 1) % 4);
    }, 150);
    return () => window.clearInterval(id);
  }, [isSpeaking]);

  // Trigger transient physical quirk animation cleanly
  useEffect(() => {
    if (!quirk || quirk === 'none') {
      setActiveQuirk('none');
      return;
    }
    setActiveQuirk(quirk);
    const id = window.setTimeout(() => setActiveQuirk('none'), 650);
    return () => window.clearTimeout(id);
  }, [quirk, quirkKey]);

  const gradId = React.useId();
  const dotGradId = React.useId();

  const lookX = isThinking ? 2.5 : mood === 'annoyed' ? 0 : eyeOffset.x;
  const lookY = isThinking ? -2 : mood === 'sad' ? 1.5 : eyeOffset.y;

  const moodMotionClass =
    activeQuirk !== 'none'
      ? ''
      : mood === 'excited' && isSpeaking
        ? 'animate-lampo-laugh'
        : mood === 'sad'
          ? 'animate-lampo-pout'
          : '';

  const quirkClass =
    activeQuirk === 'shake'
      ? 'animate-lampo-shake'
      : activeQuirk === 'bounce'
        ? 'animate-lampo-bounce'
        : activeQuirk === 'wiggle'
          ? 'animate-lampo-wiggle'
          : activeQuirk === 'jump'
            ? 'animate-lampo-jump'
            : moodMotionClass;

  const sphereStopTop =
    mood === 'annoyed'
      ? '#7F1D1D'
      : mood === 'sad'
        ? '#475569'
        : mood === 'proud'
          ? '#64748B'
          : '#64748B';
  const sphereStopMid =
    mood === 'annoyed'
      ? '#451A22'
      : mood === 'sad'
        ? '#243044'
        : '#2B3445';
  const sphereStopBot =
    mood === 'annoyed' ? '#1E1117' : '#131823';

  const ringStroke =
    mood === 'annoyed'
      ? 'rgba(248, 113, 113, 0.55)'
      : mood === 'excited' || mood === 'proud'
        ? 'rgba(251, 191, 36, 0.45)'
        : mood === 'playful'
          ? 'rgba(56, 189, 248, 0.45)'
          : 'rgba(148, 163, 184, 0.25)';

  const renderEyes = () => {
    if (blink) {
      return (
        <>
          <line x1="34" y1="49" x2="44" y2="49" stroke="#F8FAFC" strokeWidth="2.8" strokeLinecap="round" />
          <line x1="56" y1="49" x2="66" y2="49" stroke="#F8FAFC" strokeWidth="2.8" strokeLinecap="round" />
        </>
      );
    }

    if (mood === 'proud') {
      // Happy curved ^ ^ eyes
      return (
        <>
          <path d="M 34 51 Q 39 43 44 51" fill="none" stroke="#F8FAFC" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M 56 51 Q 61 43 66 51" fill="none" stroke="#F8FAFC" strokeWidth="3.2" strokeLinecap="round" />
        </>
      );
    }

    if (mood === 'playful' || activeQuirk === 'wink') {
      // Left eye open, right eye winking cheeky!
      return (
        <>
          <ellipse cx="39" cy="49" rx="4.8" ry="5.2" fill="#F8FAFC" />
          <path d="M 56 49.5 Q 61 45 66 49.5" fill="none" stroke="#F8FAFC" strokeWidth="3.2" strokeLinecap="round" />
        </>
      );
    }

    if (mood === 'sleepy') {
      return (
        <>
          <path d="M 34 49 Q 39 52.5 44 49" fill="none" stroke="#CBD5E1" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M 56 49 Q 61 52.5 66 49" fill="none" stroke="#CBD5E1" strokeWidth="2.8" strokeLinecap="round" />
        </>
      );
    }

    if (mood === 'annoyed') {
      return (
        <>
          {/* Furrowed angry brows */}
          <line x1="33" y1="40.5" x2="45" y2="44.5" stroke="#FCA5A5" strokeWidth="2.8" strokeLinecap="round" />
          <line x1="67" y1="40.5" x2="55" y2="44.5" stroke="#FCA5A5" strokeWidth="2.8" strokeLinecap="round" />
          <ellipse cx="39" cy="50" rx="4.4" ry="3.2" fill="#FEE2E2" />
          <ellipse cx="61" cy="50" rx="4.4" ry="3.2" fill="#FEE2E2" />
        </>
      );
    }

    if (mood === 'sad') {
      return (
        <>
          {/* Drooping puppy brows */}
          <line x1="33" y1="44" x2="44" y2="41" stroke="#94A3B8" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="67" y1="44" x2="56" y2="41" stroke="#94A3B8" strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="39" cy="50" rx="4.4" ry="4.5" fill="#E2E8F0" />
          <ellipse cx="61" cy="50" rx="4.4" ry="4.5" fill="#E2E8F0" />
          {/* Little shimmering tear */}
          <ellipse cx="35.5" cy="57.5" rx="1.7" ry="2.5" fill="#38BDF8" opacity="0.9" />
        </>
      );
    }

    if (mood === 'surprised') {
      return (
        <>
          <path d="M 34 40 Q 39 37 44 40" fill="none" stroke="#CBD5E1" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M 56 40 Q 61 37 66 40" fill="none" stroke="#CBD5E1" strokeWidth="2.3" strokeLinecap="round" />
          <ellipse cx="39" cy="49" rx="5.2" ry="6.2" fill="#F8FAFC" />
          <ellipse cx="61" cy="49" rx="5.2" ry="6.2" fill="#F8FAFC" />
        </>
      );
    }

    const eyeH = mood === 'excited' ? 11 : 9.5;
    return (
      <>
        {mood === 'curious' && (
          <path d="M 56 41 Q 61 38 66 41" fill="none" stroke="#CBD5E1" strokeWidth="2.2" strokeLinecap="round" />
        )}
        <ellipse cx="39" cy="49" rx="4.6" ry={eyeH / 2} fill="#F8FAFC" className="transition-all duration-75" />
        <ellipse cx="61" cy="49" rx="4.6" ry={eyeH / 2} fill="#F8FAFC" className="transition-all duration-75" />
      </>
    );
  };

  const renderMouth = () => {
    if (isSpeaking) {
      if (speakPhase === 1 || speakPhase === 3) {
        return (
          <ellipse
            cx="50"
            cy="63.5"
            rx="6"
            ry="4.2"
            fill={mood === 'annoyed' ? '#FCA5A5' : '#F8FAFC'}
            opacity="0.95"
          />
        );
      }
      if (speakPhase === 2) {
        return (
          <ellipse
            cx="50"
            cy="63.5"
            rx="4.2"
            ry="2.6"
            fill={mood === 'annoyed' ? '#FCA5A5' : '#F8FAFC'}
            opacity="0.95"
          />
        );
      }
    }

    if (mood === 'annoyed') {
      return (
        <path
          d="M 41 65 L 45.5 62 L 50 65.5 L 54.5 62 L 59 65"
          fill="none"
          stroke="#FCA5A5"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }

    if (mood === 'sad') {
      return (
        <path
          d="M 43 66.5 Q 50 60.5 57 66.5"
          fill="none"
          stroke="#CBD5E1"
          strokeWidth="2.9"
          strokeLinecap="round"
        />
      );
    }

    if (mood === 'surprised') {
      return (
        <ellipse
          cx="50"
          cy="64.5"
          rx="4"
          ry="4.8"
          fill="none"
          stroke="#F8FAFC"
          strokeWidth="2.8"
        />
      );
    }

    if (mood === 'sleepy') {
      return (
        <ellipse
          cx="50"
          cy="63.5"
          rx="3.2"
          ry="3.6"
          fill="rgba(248, 250, 252, 0.2)"
          stroke="#CBD5E1"
          strokeWidth="2.3"
        />
      );
    }

    if (mood === 'curious' || isThinking) {
      return (
        <path
          d="M 45 63.5 Q 50 61.5 55 63.5"
          fill="none"
          stroke="#F8FAFC"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      );
    }

    if (mood === 'excited' || mood === 'proud') {
      return (
        <path
          d="M 40.5 60 Q 50 70.5 59.5 60"
          fill="none"
          stroke="#F8FAFC"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
      );
    }

    if (mood === 'playful') {
      return (
        <path
          d="M 43 62 Q 51.5 68 58 59.5"
          fill="none"
          stroke="#F8FAFC"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      );
    }

    return (
      <path
        d="M 42.5 61 Q 50 67.5 57.5 61"
        fill="none"
        stroke="#F8FAFC"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    );
  };

  const renderMoodEffects = () => {
    if (mood === 'annoyed') {
      return (
        <g stroke="#F87171" strokeWidth="2.3" strokeLinecap="round" fill="none">
          {/* Comic anger cross mark on upper left */}
          <path d="M 16 26 Q 21 29 19 34" />
          <path d="M 25 22 Q 22 27 27 30" />
        </g>
      );
    }
    if (mood === 'surprised') {
      return (
        <g fill="#FBBF24">
          <rect x="17" y="18" width="3.5" height="11" rx="1.7" transform="rotate(-14 17 18)" />
          <circle cx="20.5" cy="33" r="2" />
        </g>
      );
    }
    if (mood === 'excited' || mood === 'proud') {
      return (
        <g stroke="#FBBF24" strokeWidth="2.2" strokeLinecap="round">
          <line x1="16" y1="26" x2="16" y2="34" />
          <line x1="12" y1="30" x2="20" y2="30" />
        </g>
      );
    }
    if (mood === 'sleepy') {
      return (
        <text
          x="14"
          y="29"
          fill="#94A3B8"
          fontSize="12"
          fontWeight="700"
          fontFamily="var(--font-hand)"
        >
          zZ
        </text>
      );
    }
    return null;
  };

  return (
    <div
      key={quirkKey}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`relative inline-flex items-center justify-center select-none ${
        onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''
      } ${quirkClass} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden={onClick ? undefined : true}
    >
      <svg
        viewBox="0 0 112 112"
        className="w-full h-full overflow-visible drop-shadow-[0_14px_26px_rgba(0,0,0,0.55)]"
      >
        <defs>
          <radialGradient id={gradId} cx="35%" cy="28%" r="72%">
            <stop offset="0%" stopColor={sphereStopTop} />
            <stop offset="42%" stopColor={sphereStopMid} />
            <stop offset="100%" stopColor={sphereStopBot} />
          </radialGradient>
          <radialGradient id={dotGradId} cx="32%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FF9770" />
            <stop offset="55%" stopColor="#EF5323" />
            <stop offset="100%" stopColor="#C8380E" />
          </radialGradient>
        </defs>

        {/* Subtle rim glow */}
        <circle
          cx="50"
          cy="56"
          r="39.5"
          fill="none"
          stroke={ringStroke}
          strokeWidth="1.6"
        />

        {renderMoodEffects()}

        {/* Main sphere */}
        <g className={isSpeaking ? 'origin-center transition-transform duration-150 scale-[1.03]' : ''}>
          <circle cx="50" cy="56" r="38" fill={`url(#${gradId})`} />
          {/* Soft rim light */}
          <ellipse
            cx="37"
            cy="35"
            rx="14"
            ry="7.5"
            transform="rotate(-28 37 35)"
            fill="rgba(255,255,255,0.20)"
          />

          {/* Subtle playful/happy rosy cheeks */}
          {(mood === 'happy' || mood === 'playful' || mood === 'proud' || mood === 'excited') && (
            <>
              <ellipse cx="30" cy="57" rx="4.2" ry="2.2" fill="rgba(244, 114, 182, 0.28)" />
              <ellipse cx="70" cy="57" rx="4.2" ry="2.2" fill="rgba(244, 114, 182, 0.28)" />
            </>
          )}

          {/* Eyes */}
          <g transform={`translate(${lookX}, ${lookY})`}>{renderEyes()}</g>

          {/* Mouth */}
          {renderMouth()}
        </g>

        {/* Floating orange companion sphere */}
        {showFloatingDot && (
          <g className="animate-lampo-dot">
            <circle
              cx="91"
              cy="20"
              r="15"
              fill={mood === 'annoyed' ? 'rgba(248, 113, 113, 0.35)' : 'rgba(239, 83, 35, 0.28)'}
            />
            <circle
              cx="91"
              cy="20"
              r="9.2"
              fill={`url(#${dotGradId})`}
            />
          </g>
        )}
      </svg>
    </div>
  );
};
