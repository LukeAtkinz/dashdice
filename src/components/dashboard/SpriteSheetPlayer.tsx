import React, { useEffect, useRef, useState } from 'react';

interface SpriteFrame {
  filename: string;
  frame: { x: number; y: number; w: number; h: number };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
}

interface SpriteSheetData {
  frames: SpriteFrame[];
}

interface SpriteSheetPlayerProps {
  jsonPath: string;
  imagePath: string;
  frameRate?: number;
  loop?: boolean;
  onComplete?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export const SpriteSheetPlayer: React.FC<SpriteSheetPlayerProps> = ({
  jsonPath,
  imagePath,
  frameRate = 30,
  loop = false,
  onComplete,
  style,
  className
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spriteData, setSpriteData] = useState<SpriteSheetData | null>(null);
  const [spriteImage, setSpriteImage] = useState<HTMLImageElement | null>(null);
  const currentFrameRef = useRef(0);
  const animationIdRef = useRef<number>();

  // Load sprite sheet data
  useEffect(() => {
    fetch(jsonPath)
      .then(res => res.json())
      .then(data => setSpriteData(data))
      .catch(err => console.error('Failed to load sprite sheet data:', err));
  }, [jsonPath]);

  // Load sprite sheet image
  useEffect(() => {
    const img = new Image();
    img.onload = () => setSpriteImage(img);
    img.onerror = () => console.error('Failed to load sprite sheet image');
    img.src = imagePath;
  }, [imagePath]);

  // Animation loop
  useEffect(() => {
    if (!canvasRef.current || !spriteData || !spriteImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frames = spriteData.frames;
    const frameDelay = 1000 / frameRate;
    let lastFrameTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - lastFrameTime;

      if (elapsed >= frameDelay) {
        lastFrameTime = now;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Get current frame data
        const frame = frames[currentFrameRef.current];
        if (!frame) return;

        // Draw the frame
        ctx.drawImage(
          spriteImage,
          frame.frame.x,
          frame.frame.y,
          frame.frame.w,
          frame.frame.h,
          0,
          0,
          canvas.width,
          canvas.height
        );

        // Move to next frame
        currentFrameRef.current++;

        if (currentFrameRef.current >= frames.length) {
          if (loop) {
            currentFrameRef.current = 0;
          } else {
            // Animation complete
            if (onComplete) onComplete();
            return;
          }
        }
      }

      animationIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [spriteData, spriteImage, frameRate, loop, onComplete]);

  // Set canvas dimensions based on first frame
  useEffect(() => {
    if (!canvasRef.current || !spriteData) return;

    const firstFrame = spriteData.frames[0];
    if (!firstFrame) return;

    // Use the source size as canvas dimensions
    canvasRef.current.width = firstFrame.sourceSize.w;
    canvasRef.current.height = firstFrame.sourceSize.h;
  }, [spriteData]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={style}
    />
  );
};
