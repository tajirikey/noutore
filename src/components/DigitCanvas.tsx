"use client";

import { useRef, useEffect, useCallback } from "react";

interface DigitCanvasProps {
  width?: number;
  height?: number;
  lineWidth?: number;
  onDrawEnd?: () => void;
  label: string;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export default function DigitCanvas({
  width = 200,
  height = 200,
  lineWidth = 8,
  onDrawEnd,
  label,
  canvasRef,
}: DigitCanvasProps) {
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const getPos = useCallback(
    (e: PointerEvent, canvas: HTMLCanvasElement) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize canvas
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#333";
    ctx.lineWidth = lineWidth;

    const handlePointerDown = (e: PointerEvent) => {
      e.preventDefault();
      isDrawingRef.current = true;
      const pos = getPos(e, canvas);
      lastPointRef.current = pos;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const pos = getPos(e, canvas);

      // Use pressure if available (Apple Pencil)
      const pressure = e.pressure > 0 ? e.pressure : 0.5;
      ctx.lineWidth = lineWidth * (0.5 + pressure * 0.8);

      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      lastPointRef.current = pos;
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      isDrawingRef.current = false;
      lastPointRef.current = null;
      ctx.beginPath();
      onDrawEnd?.();
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerUp);
    };
  }, [canvasRef, lineWidth, getPos, onDrawEnd]);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-sm text-gray-500 font-bold">{label}</span>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="border-4 border-gray-300 rounded-2xl bg-white"
          style={{
            touchAction: "none",
            width: `${width}px`,
            height: `${height}px`,
          }}
        />
        <button
          onClick={clearCanvas}
          className="absolute -top-2 -right-2 w-8 h-8 bg-gray-400 text-white rounded-full text-xs font-bold hover:bg-gray-500 active:bg-gray-600 flex items-center justify-center"
          type="button"
        >
          ×
        </button>
      </div>
    </div>
  );
}
