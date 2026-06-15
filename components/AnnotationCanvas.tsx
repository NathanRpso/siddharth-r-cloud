'use client';

import { useEffect, useRef, useState } from 'react';

export type AnnotateTool = 'off' | 'pen' | 'line' | 'arrow' | 'dot';

export interface Stroke {
  tool: Exclude<AnnotateTool, 'off'>;
  color: string;
  /** Points in normalized 0..1 coords so the drawing survives resizes. */
  points: Array<{ x: number; y: number }>;
}

/**
 * A pointer-driven drawing overlay for a video tile.
 *
 * Controlled: committed `strokes` live in the parent (so it can clear a single
 * frame, clear all, undo across frames, and know which frames are marked up).
 * This component only owns the in-progress draft; on pointer-up it hands the
 * finished stroke to `onCommit`. Strokes are normalized 0..1 so they survive
 * resizes. The overlay captures pointer events only when a tool is armed.
 */
export default function AnnotationCanvas({
  tool,
  color,
  strokes,
  onCommit,
}: {
  tool: AnnotateTool;
  color: string;
  strokes: Stroke[];
  onCommit: (s: Stroke) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<Stroke | null>(null);
  const [, force] = useState(0);

  // Keep the backing store sized to the element (handles tile resizes).
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ro = new ResizeObserver(() => {
      const { width, height } = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      force((n) => n + 1);
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // Redraw whenever committed strokes change or on resize tick.
  useEffect(() => {
    draw();
  });

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);
    const all = draftRef.current ? [...strokes, draftRef.current] : strokes;
    for (const s of all) paintStroke(ctx, s, w, h);
  }

  function paintStroke(ctx: CanvasRenderingContext2D, s: Stroke, w: number, h: number) {
    const pts = s.points.map((p) => ({ x: p.x * w, y: p.y * h }));
    if (!pts.length) return;
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = Math.max(2, w * 0.006);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (s.tool === 'dot') {
      const p = pts[pts.length - 1];
      ctx.beginPath();
      ctx.arc(p.x, p.y, ctx.lineWidth * 2.4, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (s.tool === 'pen') {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      return;
    }

    // line + arrow: first → last
    const a = pts[0];
    const b = pts[pts.length - 1];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    if (s.tool === 'arrow') {
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const head = Math.max(8, w * 0.022);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - head * Math.cos(ang - Math.PI / 6), b.y - head * Math.sin(ang - Math.PI / 6));
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - head * Math.cos(ang + Math.PI / 6), b.y - head * Math.sin(ang + Math.PI / 6));
      ctx.stroke();
    }
  }

  function pointFromEvent(e: React.PointerEvent): { x: number; y: number } {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (tool === 'off') return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = pointFromEvent(e);
    draftRef.current = { tool, color, points: [p] };
    draw();
  }

  function onPointerMove(e: React.PointerEvent) {
    if (tool === 'off' || !draftRef.current) return;
    const p = pointFromEvent(e);
    const d = draftRef.current;
    if (d.tool === 'pen') d.points.push(p);
    else d.points = [d.points[0], p]; // line/arrow/dot track the endpoint
    draw();
  }

  function onPointerUp() {
    if (!draftRef.current) return;
    const committed = draftRef.current;
    draftRef.current = null;
    onCommit(committed);
  }

  const armed = tool !== 'off';

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0"
      style={{ pointerEvents: armed ? 'auto' : 'none', cursor: armed ? 'crosshair' : 'default' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
