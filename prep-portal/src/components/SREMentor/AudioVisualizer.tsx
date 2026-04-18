import React, { useEffect, useRef } from 'react';

interface Props {
  volume: number;
  active: boolean;
}

export function AudioVisualizer({ volume, active }: Props): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const barsRef = useRef<number[]>(Array(20).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;
    const bars = barsRef.current;
    const barCount = bars.length;
    const barWidth = 3;
    const gap = (W - barCount * barWidth) / (barCount + 1);

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < barCount; i++) {
        if (active) {
          const noise = Math.random() * volume * 120;
          const wave = Math.sin(Date.now() / 200 + i * 0.5) * volume * 40;
          bars[i] = Math.max(4, Math.min(H * 0.85, bars[i] * 0.7 + noise + wave));
        } else {
          bars[i] = Math.max(4, bars[i] * 0.85);
        }

        const x = gap + i * (barWidth + gap);
        const barH = bars[i];
        const y = (H - barH) / 2;

        const grad = ctx.createLinearGradient(x, y, x, y + barH);
        grad.addColorStop(0, active ? 'rgba(96,165,250,0.9)' : 'rgba(100,116,139,0.4)');
        grad.addColorStop(1, active ? 'rgba(37,99,235,0.6)' : 'rgba(71,85,105,0.2)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, barWidth / 2);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [active, volume]);

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={60}
      style={{ display: 'block' }}
    />
  );
}
