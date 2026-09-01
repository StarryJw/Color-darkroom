'use client';

import { useRef } from 'react';
import { Slider } from '@/components/ui/slider';
import { angularDistance } from '@/lib/color-engine';

interface ColorWheelProps {
  base: number;
  accent: number;
  onChange: (kind: 'base' | 'accent', value: number) => void;
}

const wheelPoint = (hue: number) => {
  const radians = ((hue - 90) * Math.PI) / 180;
  return { x: 60 + Math.cos(radians) * 42, y: 60 + Math.sin(radians) * 42 };
};

/** 可拖动的双点色轮，用于观察两个色相之间的角距离。 */
export function ColorWheel({ base, accent, onChange }: ColorWheelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const activeRef = useRef<'base' | 'accent'>('base');
  const basePoint = wheelPoint(base);
  const accentPoint = wheelPoint(accent);

  const updateFromPointer = (clientX: number, clientY: number) => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const x = ((clientX - bounds.left) / bounds.width) * 120 - 60;
    const y = ((clientY - bounds.top) / bounds.height) * 120 - 60;
    const degrees = (Math.atan2(y, x) * 180) / Math.PI + 90;
    onChange(activeRef.current, (degrees + 360) % 360);
  };

  return (
    <div>
      <div className="relative mx-auto aspect-square w-44">
        <div className="color-wheel-ring absolute inset-0 rounded-full" aria-hidden="true" />
        <svg
          ref={svgRef}
          viewBox="0 0 120 120"
          className="absolute inset-0 size-full touch-none"
          aria-label={`主色 ${Math.round(base)} 度，强调色 ${Math.round(accent)} 度，相差 ${Math.round(angularDistance(base, accent))} 度`}
          onPointerDown={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            const x = ((event.clientX - bounds.left) / bounds.width) * 120;
            const y = ((event.clientY - bounds.top) / bounds.height) * 120;
            activeRef.current = Math.hypot(x - basePoint.x, y - basePoint.y) < Math.hypot(x - accentPoint.x, y - accentPoint.y) ? 'base' : 'accent';
            event.currentTarget.setPointerCapture(event.pointerId);
            updateFromPointer(event.clientX, event.clientY);
          }}
          onPointerMove={(event) => event.currentTarget.hasPointerCapture(event.pointerId) && updateFromPointer(event.clientX, event.clientY)}
        >
          <title>主色与强调色的色相距离</title>
          <circle cx="60" cy="60" r="30" fill="var(--background)" opacity="0.96" />
          <line x1={basePoint.x} y1={basePoint.y} x2={accentPoint.x} y2={accentPoint.y} stroke="white" strokeOpacity="0.36" strokeDasharray="3 3" />
          <circle cx={basePoint.x} cy={basePoint.y} r="6" fill={`hsl(${base} 78% 58%)`} stroke="white" strokeWidth="2.5" />
          <circle cx={accentPoint.x} cy={accentPoint.y} r="6" fill={`hsl(${accent} 78% 58%)`} stroke="white" strokeWidth="2.5" />
          <text x="60" y="57" textAnchor="middle" className="fill-white text-[8px] font-semibold">{Math.round(angularDistance(base, accent))}°</text>
          <text x="60" y="68" textAnchor="middle" className="fill-white/50 text-[6px]">色相距离</text>
        </svg>
      </div>
      <div className="mt-5 space-y-4">
        <label className="block text-xs">
          <span className="mb-2 flex justify-between"><span>主色</span><output className="font-mono text-cyan-300">{Math.round(base)}°</output></span>
          <Slider value={[base]} min={0} max={359} onValueChange={(value) => onChange('base', Array.isArray(value) ? value[0] : value)} aria-label="主色色相" />
        </label>
        <label className="block text-xs">
          <span className="mb-2 flex justify-between"><span>强调色</span><output className="font-mono text-cyan-300">{Math.round(accent)}°</output></span>
          <Slider value={[accent]} min={0} max={359} onValueChange={(value) => onChange('accent', Array.isArray(value) ? value[0] : value)} aria-label="强调色色相" />
        </label>
      </div>
    </div>
  );
}
