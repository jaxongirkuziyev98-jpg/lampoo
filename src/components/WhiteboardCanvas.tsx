import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { DrawCommand, LessonStep } from '../types/lesson';
import { LampoMascot } from './LampoMascot';
import {
  buildCommandStrokes,
  buildRectHatchStrokes,
  buildSketchAsset,
  getTextTip,
  pointsToSmoothPath,
  resolveTriangleVertices,
  sliceStrokesAtProgress,
  type Point,
  type SketchSubLabel,
} from '../utils/handDraw';

function wrapTextLines(text: string, maxChars: number): string[] {
  const clean = text.trim();
  if (!clean || clean.length <= maxChars) return clean ? [clean] : [];
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if (!current) {
      current = w;
    } else if (current.length + 1 + w.length <= maxChars) {
      current += ` ${w}`;
    } else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

interface WhiteboardCanvasProps {
  steps: LessonStep[];
  currentStepIndex: number;
  speechProgress: number;
  isPlaying: boolean;
  isSpeaking: boolean;
}

interface TimedCommand {
  key: string;
  cmd: DrawCommand;
  isCurrentStep: boolean;
  startAt: number;
  endAt: number;
}

function getDefaultInkByKind(kind: DrawCommand['kind']): string {
  switch (kind) {
    case 'sun':
    case 'highlight':
      return '#FBBF24';
    case 'tree':
    case 'rect':
      return '#34D399';
    case 'molecule':
    case 'sine':
      return '#A78BFA';
    case 'axes':
      return '#94A3B8';
    case 'underline':
    case 'arrow':
    case 'triangle':
    case 'parabola':
    case 'circle':
    case 'ellipse':
    case 'curve':
    case 'sketch':
      return '#38BDF8';
    case 'text':
      return '#F8FAFC';
    default:
      return '#F1F5F9';
  }
}

function resolveInkColor(cmd: DrawCommand): string {
  const rawColor = cmd.color;
  if (!rawColor || !rawColor.trim()) {
    return getDefaultInkByKind(cmd.kind);
  }
  const c = rawColor.trim().toUpperCase();
  if (
    c === '#1E293B' ||
    c === '#0F172A' ||
    c === '#000000' ||
    c === '#111827' ||
    c === '#334155' ||
    c === '#475569'
  ) {
    return '#F8FAFC';
  }
  if (c === '#2563EB') return '#38BDF8';
  if (c === '#DC2626') return '#F87171';
  if (c === '#059669') return '#34D399';
  if (c === '#D97706') return '#FBBF24';
  if (c === '#7C3AED') return '#A78BFA';
  return rawColor;
}

function getCommandWeight(cmd: DrawCommand): number {
  switch (cmd.kind) {
    case 'text':
      return Math.max(1.0, Math.min(2.6, (cmd.label?.length || 8) / 14));
    case 'sketch':
      return 1.95;
    case 'axes':
    case 'tree':
    case 'molecule':
      return 1.8;
    case 'triangle':
    case 'rect':
    case 'highlight':
    case 'sun':
      return 1.45;
    case 'underline':
      return 0.7;
    default:
      return 1.15;
  }
}

/**
 * Assigns each drawCommand in a scene a [startAt, endAt] window in [0, 0.94]
 * aligned with spoken narration timing (`cmd.at` if provided, or weighted sequentially).
 */
function computeStepSchedule(cmds: DrawCommand[]): Array<{ startAt: number; endAt: number }> {
  const n = cmds.length;
  if (n === 0) return [];

  const maxTimeline = 0.94;
  const hasExplicitAt = cmds.some(
    (c) => typeof c.at === 'number' && Number.isFinite(c.at) && c.at >= 0 && c.at <= 0.92
  );

  if (hasExplicitAt) {
    const starts: number[] = [];
    let prev = 0;
    for (let i = 0; i < n; i++) {
      const raw = cmds[i].at;
      const fallback = (i / n) * 0.82;
      const clamped =
        typeof raw === 'number' && Number.isFinite(raw)
          ? Math.max(0, Math.min(0.86, raw))
          : fallback;
      const s = Math.max(prev + (i === 0 ? 0 : 0.03), clamped);
      starts.push(Math.min(0.88, s));
      prev = starts[i];
    }
    return starts.map((s, i) => {
      const nextStart = i < n - 1 ? starts[i + 1] : maxTimeline;
      const span = Math.max(0.06, Math.min(0.24, nextStart - s + 0.02));
      return { startAt: s, endAt: Math.min(maxTimeline, s + span) };
    });
  }

  const weights = cmds.map(getCommandWeight);
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
  const slots: Array<{ startAt: number; endAt: number }> = [];
  let cursor = 0.01;
  const usable = maxTimeline - cursor;
  for (let i = 0; i < n; i++) {
    const share = (weights[i] / totalWeight) * usable;
    slots.push({ startAt: cursor, endAt: Math.min(maxTimeline, cursor + share) });
    cursor += share;
  }
  return slots;
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  steps,
  currentStepIndex,
  speechProgress,
  isPlaying,
  isSpeaking,
}) => {
  const clampedSpeech = Math.max(0, Math.min(1, speechProgress));
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageDims, setStageDims] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      const availW = Math.max(240, rect.width - 12);
      const availH = Math.max(160, rect.height - 8);
      const scale = Math.min(availW / 1000, availH / 475);
      setStageDims({
        w: Math.floor(1000 * scale),
        h: Math.floor(475 * scale),
      });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const itemsToRender = useMemo<TimedCommand[]>(() => {
    if (!steps.length) return [];
    let startIdx = 0;
    for (let i = currentStepIndex; i >= 0; i--) {
      if (steps[i]?.clearBefore) {
        startIdx = i;
        break;
      }
    }

    const list: TimedCommand[] = [];
    for (let s = startIdx; s <= currentStepIndex; s++) {
      const step = steps[s];
      if (!step) continue;
      const cmds = step.drawCommands || [];
      const isCurrent = s === currentStepIndex;
      const schedule = isCurrent ? computeStepSchedule(cmds) : [];
      cmds.forEach((cmd, idx) => {
        list.push({
          key: `step_${s}_cmd_${idx}`,
          cmd,
          isCurrentStep: isCurrent,
          startAt: isCurrent ? schedule[idx]?.startAt ?? 0 : 0,
          endAt: isCurrent ? schedule[idx]?.endAt ?? 1 : 0,
        });
      });
    }
    return list;
  }, [steps, currentStepIndex]);

  // Precompute deterministic hand-drawn stroke geometries for visible commands
  const strokeCache = useMemo(() => {
    const map = new Map<
      string,
      {
        strokes: Point[][];
        hatchStrokes: Point[][];
        sketchColors?: string[];
        subLabels?: SketchSubLabel[];
      }
    >();
    for (const item of itemsToRender) {
      if (item.cmd.kind === 'sketch') {
        const asset = buildSketchAsset(item.cmd, item.key);
        map.set(item.key, {
          strokes: asset.strokes,
          hatchStrokes: [],
          sketchColors: asset.colors,
          subLabels: asset.subLabels,
        });
        continue;
      }
      const strokes = buildCommandStrokes(item.cmd, item.key);
      const hatchStrokes =
        item.cmd.kind === 'highlight' ||
        (item.cmd.kind === 'rect' && item.cmd.fill && item.cmd.fill !== 'none')
          ? buildRectHatchStrokes(
              item.cmd.x,
              item.cmd.y,
              item.cmd.width ?? 150,
              item.cmd.height ?? 80,
              item.key,
              item.cmd.kind === 'highlight' ? 11 : 14
            )
          : [];
      map.set(item.key, { strokes, hatchStrokes });
    }
    return map;
  }, [itemsToRender]);

  const currentStep = steps[currentStepIndex];
  const currentMood = currentStep?.mood || 'explaining';

  const getLocalProgress = (item: TimedCommand): number => {
    if (!item.isCurrentStep) return 1;
    if (clampedSpeech <= item.startAt) return 0;
    const dur = Math.max(0.02, item.endAt - item.startAt);
    return Math.max(0, Math.min(1, (clampedSpeech - item.startAt) / dur));
  };

  // Compute live pen nib tip right on the active stroke
  const activeTip = useMemo(() => {
    const currentItems = itemsToRender.filter((it) => it.isCurrentStep);
    if (!currentItems.length) {
      return { x: 140, y: 120, active: false };
    }

    // If speech hasn't started yet (waiting for audio), rest Lampo near the first drawing coordinate
    if (clampedSpeech <= 0.001) {
      const first = currentItems[0];
      return {
        x: Math.max(70, Math.min(930, first.cmd.x)),
        y: Math.max(55, Math.min(430, first.cmd.y)),
        active: false,
      };
    }

    // Find the item currently being drawn, or the most recently completed one
    let activeItem = currentItems[0];
    let localP = 0;
    for (const item of currentItems) {
      const p = getLocalProgress(item);
      if (p > 0 && p < 1) {
        activeItem = item;
        localP = p;
        break;
      }
      if (p >= 1) {
        activeItem = item;
        localP = 1;
      }
    }

    let tip: Point;
    if (activeItem.cmd.kind === 'text') {
      tip = getTextTip(activeItem.cmd, localP);
    } else {
      const cached = strokeCache.get(activeItem.key);
      const strokes = cached?.strokes || [];
      tip = sliceStrokesAtProgress(strokes, localP).tip;
    }

    const isActivelyDrawing =
      localP > 0 && localP < 1 && (isSpeaking || isPlaying);

    return {
      x: Math.max(68, Math.min(932, tip[0])),
      y: Math.max(50, Math.min(432, tip[1])),
      active: isActivelyDrawing,
    };
  }, [itemsToRender, clampedSpeech, strokeCache, isSpeaking, isPlaying]);

  const renderCommand = (item: TimedCommand) => {
    const p = getLocalProgress(item);
    if (p <= 0) return null;

    const { cmd, key } = item;
    const color = resolveInkColor(cmd);
    const strokeWidth = cmd.strokeWidth || 2.5;
    const dashArray = cmd.dashed ? '7 6' : undefined;
    const cached = strokeCache.get(key);
    const strokes = cached?.strokes || [];
    const hatchStrokes = cached?.hatchStrokes || [];

    if (cmd.kind === 'text') {
      const fullText = cmd.label || '';
      const fontSize = cmd.fontSize || 21;
      const isRightCol = cmd.x >= 520;
      const safeX = isRightCol
        ? Math.max(545, Math.min(595, cmd.x))
        : Math.max(68, Math.min(440, cmd.x));
      const safeY = Math.max(46, Math.min(410, cmd.y));
      const maxChars = isRightCol ? 28 : 44;
      const allLines = wrapTextLines(fullText, maxChars);
      const visibleCount = Math.ceil(fullText.length * p);
      let remaining = visibleCount;
      const lineDy = Math.round(fontSize * 1.24);

      return (
        <text
          key={key}
          x={safeX}
          y={safeY}
          fill={color}
          fontSize={fontSize}
          fontWeight={cmd.bold ? 700 : 500}
          fontFamily="var(--font-hand)"
          letterSpacing="0.01em"
          style={{ opacity: Math.min(1, p * 2.5) }}
        >
          {allLines.map((lineText, idx) => {
            if (remaining <= 0) return null;
            const shown = lineText.slice(0, remaining);
            remaining -= lineText.length + 1;
            return (
              <tspan key={idx} x={safeX} dy={idx === 0 ? 0 : lineDy}>
                {shown}
              </tspan>
            );
          })}
        </text>
      );
    }

    const { visible } = sliceStrokesAtProgress(strokes, p);

    switch (cmd.kind) {
      case 'tree': {
        // First 4 strokes are trunk & branches (warm wood amber), rest are leafy canopy (emerald)
        const trunkStrokes = visible.slice(0, 4);
        const canopyStrokes = visible.slice(4);
        const w = cmd.width ?? 150;
        const h = cmd.height ?? 190;
        const cx = cmd.x + w / 2;
        const baseBottom = cmd.y + h;

        return (
          <g key={key}>
            {trunkStrokes.map((pts, i) => (
              <path
                key={`${key}_tr_${i}`}
                d={pointsToSmoothPath(pts)}
                fill="none"
                stroke="#D97706"
                strokeWidth={i < 2 ? 2.8 : 2.3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {canopyStrokes.map((pts, i) => (
              <path
                key={`${key}_cn_${i}`}
                d={pointsToSmoothPath(pts)}
                fill="none"
                stroke="#34D399"
                strokeWidth={i === 0 ? 2.7 : 2.0}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {cmd.label && p > 0.75 && (
              <text
                x={cx}
                y={baseBottom + 22}
                textAnchor="middle"
                fill="#6EE7B7"
                fontSize={16}
                fontWeight={600}
                fontFamily="var(--font-hand)"
              >
                {cmd.label}
              </text>
            )}
          </g>
        );
      }

      case 'sun': {
        const r = cmd.radius ?? 32;
        return (
          <g key={key}>
            {visible.map((pts, i) => (
              <path
                key={`${key}_s_${i}`}
                d={pointsToSmoothPath(pts)}
                fill={i === 0 && p > 0.45 ? 'rgba(251, 191, 36, 0.10)' : 'none'}
                stroke="#FBBF24"
                strokeWidth={i === 0 ? strokeWidth : 2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {cmd.label && p > 0.75 && (
              <text
                x={cmd.x}
                y={cmd.y + r + 36}
                textAnchor="middle"
                fill="#FDE68A"
                fontSize={16}
                fontWeight={600}
                fontFamily="var(--font-hand)"
              >
                {cmd.label}
              </text>
            )}
          </g>
        );
      }

      case 'molecule': {
        return (
          <g key={key}>
            {visible.map((pts, i) => {
              const isBond = i === 1 || i === 3;
              const isSideAtom = i === 2 || i === 4;
              return (
                <path
                  key={`${key}_m_${i}`}
                  d={pointsToSmoothPath(pts)}
                  fill="none"
                  stroke={isBond ? '#94A3B8' : isSideAtom ? '#F87171' : color}
                  strokeWidth={isBond ? 2.2 : 2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}
            {cmd.label && p > 0.65 && (
              <text
                x={cmd.x}
                y={cmd.y + 5}
                textAnchor="middle"
                fill="#F8FAFC"
                fontSize={15}
                fontWeight={700}
                fontFamily="var(--font-hand)"
              >
                {cmd.label}
              </text>
            )}
          </g>
        );
      }

      case 'axes': {
        const w = cmd.width ?? 360;
        const h = cmd.height ?? 250;
        const midX = cmd.x + w / 2;
        const midY = cmd.y + h / 2;
        return (
          <g key={key}>
            {visible.map((pts, i) => (
              <path
                key={`${key}_ax_${i}`}
                d={pointsToSmoothPath(pts)}
                fill="none"
                stroke="#94A3B8"
                strokeWidth={i < 6 ? 2.3 : 1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {p > 0.78 && (
              <>
                <text
                  x={midX + 12}
                  y={cmd.y + 14}
                  fill="#CBD5E1"
                  fontSize="16"
                  fontWeight={600}
                  fontFamily="var(--font-hand)"
                >
                  y
                </text>
                <text
                  x={cmd.x + w - 12}
                  y={midY + 20}
                  fill="#CBD5E1"
                  fontSize="16"
                  fontWeight={600}
                  fontFamily="var(--font-hand)"
                >
                  x
                </text>
                <text
                  x={midX + 8}
                  y={midY + 18}
                  fill="#94A3B8"
                  fontSize="14"
                  fontFamily="var(--font-hand)"
                >
                  0
                </text>
                {cmd.label && (
                  <text
                    x={cmd.x + w - 8}
                    y={cmd.y + 20}
                    textAnchor="end"
                    fill={color}
                    fontSize="17"
                    fontWeight={700}
                    fontFamily="var(--font-hand)"
                  >
                    {cmd.label}
                  </text>
                )}
              </>
            )}
          </g>
        );
      }

      case 'rect':
      case 'highlight': {
        const w = cmd.width ?? 150;
        const h = cmd.height ?? 80;
        const hatchCount = Math.floor(hatchStrokes.length * Math.min(1, p * 1.15));
        return (
          <g key={key}>
            {/* Subtle notebook diagonal pen hatching instead of flat UI card fill */}
            {hatchStrokes.slice(0, hatchCount).map((pts, i) => (
              <path
                key={`${key}_ht_${i}`}
                d={pointsToSmoothPath(pts)}
                fill="none"
                stroke={color}
                strokeOpacity={0.18}
                strokeWidth={1.3}
                strokeLinecap="round"
              />
            ))}
            {visible.map((pts, i) => (
              <path
                key={`${key}_rc_${i}`}
                d={pointsToSmoothPath(pts)}
                fill="none"
                stroke={color}
                strokeWidth={cmd.kind === 'highlight' ? 2.1 : strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={dashArray}
              />
            ))}
            {cmd.label && p > 0.65 && (
              <text
                x={cmd.x + w / 2}
                y={cmd.y + h / 2 + 5}
                textAnchor="middle"
                fill={color}
                fontSize={cmd.fontSize || 18}
                fontWeight={600}
                fontFamily="var(--font-hand)"
              >
                {cmd.label}
              </text>
            )}
          </g>
        );
      }

      case 'parabola':
      case 'sine': {
        const plotColor =
          color === '#F1F5F9'
            ? cmd.kind === 'parabola'
              ? '#38BDF8'
              : '#A78BFA'
            : color;
        const w = cmd.width ?? 260;
        return (
          <g key={key}>
            {visible.map((pts, i) => (
              <path
                key={`${key}_pl_${i}`}
                d={pointsToSmoothPath(pts)}
                fill="none"
                stroke={plotColor}
                strokeWidth={strokeWidth + 0.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {cmd.label && p > 0.72 && (
              <text
                x={cmd.kind === 'parabola' ? cmd.x + w + 10 : cmd.x + w / 2}
                y={cmd.kind === 'parabola' ? cmd.y + 18 : cmd.y - 8}
                textAnchor={cmd.kind === 'parabola' ? 'start' : 'middle'}
                fill={plotColor}
                fontSize={cmd.fontSize || 18}
                fontWeight={700}
                fontFamily="var(--font-hand)"
              >
                {cmd.label}
              </text>
            )}
          </g>
        );
      }

      case 'sketch': {
        const sketchColors = cached?.sketchColors || [];
        const subLabels = cached?.subLabels || [];
        const w = Math.max(90, Math.min(360, cmd.width ?? 200));
        const h = Math.max(90, Math.min(300, cmd.height ?? 190));
        const cx = cmd.x + w / 2;
        const labelY = Math.min(442, cmd.y + h + 22);

        return (
          <g key={key}>
            {visible.map((pts, i) => (
              <path
                key={`${key}_sk_${i}`}
                d={pointsToSmoothPath(pts)}
                fill="none"
                stroke={sketchColors[i] || color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {subLabels.length > 0 && p > 0.55 && (
              <g>
                {subLabels.map((sl, idx) => (
                  <text
                    key={`${key}_sl_${idx}`}
                    x={sl.x}
                    y={sl.y}
                    textAnchor="middle"
                    fill={sl.color}
                    fontSize={17}
                    fontWeight={700}
                    fontFamily="var(--font-hand)"
                  >
                    {sl.text}
                  </text>
                ))}
              </g>
            )}
            {cmd.label && p > 0.72 && (
              <text
                x={cx}
                y={labelY}
                textAnchor="middle"
                fill={color === '#38BDF8' ? '#E2E8F0' : color}
                fontSize={cmd.fontSize || 17}
                fontWeight={600}
                fontFamily="var(--font-hand)"
              >
                {cmd.label}
              </text>
            )}
          </g>
        );
      }

      default: {
        // line, arrow, circle, ellipse, triangle, curve, underline, freehand
        const labelPos = (() => {
          if (!cmd.label) return null;
          if (cmd.kind === 'line' || cmd.kind === 'arrow') {
            const x2 = cmd.x2 ?? cmd.x + 120;
            const y2 = cmd.y2 ?? cmd.y;
            return { x: (cmd.x + x2) / 2, y: (cmd.y + y2) / 2 - 11 };
          }
          if (cmd.kind === 'triangle') {
            const { x1, y1, x2, y2, x3, y3 } = resolveTriangleVertices(cmd);
            return { x: (x1 + x2 + x3) / 3, y: (y1 + y2 + y3) / 3 + 6 };
          }
          if (cmd.kind === 'curve') {
            const x2 = cmd.x2 ?? cmd.x + 160;
            const cx = cmd.cx ?? (cmd.x + x2) / 2;
            const cy = cmd.cy ?? cmd.y - 80;
            return { x: cx, y: cy - 8 };
          }
          if (cmd.kind === 'circle' || cmd.kind === 'ellipse') {
            return { x: cmd.x, y: cmd.y + 6 };
          }
          return { x: cmd.x, y: cmd.y - 10 };
        })();

        return (
          <g key={key}>
            {visible.map((pts, i) => (
              <path
                key={`${key}_st_${i}`}
                d={pointsToSmoothPath(pts)}
                fill="none"
                stroke={color}
                strokeWidth={cmd.kind === 'underline' ? 2.2 : strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={dashArray}
              />
            ))}
            {labelPos && cmd.label && p > 0.68 && (
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                fill={color}
                fontSize={cmd.fontSize || 17}
                fontWeight={600}
                fontFamily="var(--font-hand)"
              >
                {cmd.label}
              </text>
            )}
          </g>
        );
      }
    }
  };

  // Keep Lampo strictly inside visible 1000x475 chalkboard bounds so it never disappears off-screen
  const rawLampoX = activeTip.x < 170 ? activeTip.x + 56 : activeTip.x - 54;
  const lampoX = Math.max(58, Math.min(936, rawLampoX));
  const lampoY = Math.max(52, Math.min(416, activeTip.y + 12));
  const lampoLeftPct = (lampoX / 1000) * 100;
  const lampoTopPct = (lampoY / 475) * 100;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden whiteboard-grid p-1 sm:p-2"
    >
      <div
        className="relative select-none"
        style={
          stageDims
            ? { width: `${stageDims.w}px`, height: `${stageDims.h}px` }
            : { width: '100%', height: '100%', maxWidth: '1160px' }
        }
      >
        <svg
          viewBox="0 0 1000 475"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Subtle notebook left margin rule */}
          <line
            x1={54}
            y1={0}
            x2={54}
            y2={475}
            stroke="rgba(248, 113, 113, 0.20)"
            strokeWidth={1.5}
          />

          {itemsToRender.map(renderCommand)}
        </svg>

        {/* Lampo mascot gliding smoothly inside chalkboard bounds without leaving screen */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${lampoLeftPct}%`,
            top: `${lampoTopPct}%`,
            transform: 'translate(-50%, -50%)',
            transition: isPlaying
              ? 'left 200ms cubic-bezier(0.16, 1, 0.3, 1), top 200ms cubic-bezier(0.16, 1, 0.3, 1)'
              : 'left 320ms cubic-bezier(0.16, 1, 0.3, 1), top 320ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <LampoMascot
            size={56}
            mood={currentMood}
            isSpeaking={isSpeaking}
            showFloatingDot={false}
          />
        </div>
      </div>
    </div>
  );
};
