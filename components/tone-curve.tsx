'use client';

import { useRef } from 'react';
import type { CurvePoint } from '@/lib/types';

interface ToneCurveProps {
  points: CurvePoint[];
  onChange: (points: CurvePoint[]) => void;
}

/** 只开放两个中间控制点的摄影 S 曲线编辑器。 */
export function ToneCurve({ points, onChange }: ToneCurveProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const activeIndex = useRef(1);
  const displayPoints = points.map((point) => `${point.x},${255 - point.y}`).join(' ');

  const updatePoint = (clientY: number) => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const y = Math.max(0, Math.min(255, 255 - ((clientY - bounds.top) / bounds.height) * 255));
    onChange(points.map((point, index) => (index === activeIndex.current ? { ...point, y: Math.round(y) } : point)));
  };

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox="0 0 255 255"
        className="aspect-square w-full touch-none rounded-xl border border-white/10 bg-black/20"
        aria-label="RGB 明暗曲线，拖动两个控制点调整阴影和高光"
        onPointerMove={(event) => event.currentTarget.hasPointerCapture(event.pointerId) && updatePoint(event.clientY)}
      >
        <title>RGB 明暗曲线</title>
        {[64, 128, 192].map((value) => <path key={`v${value}`} d={`M${value} 0V255 M0 ${value}H255`} stroke="white" strokeOpacity="0.07" />)}
        <path d="M0 255L255 0" stroke="white" strokeOpacity="0.13" strokeDasharray="5 5" />
        <polyline points={displayPoints} fill="none" stroke="#72d5e8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <circle
            key={`${point.x}-${index}`}
            cx={point.x}
            cy={255 - point.y}
            r={index === 0 || index === points.length - 1 ? 4 : 7}
            fill={index === 0 || index === points.length - 1 ? '#65707c' : '#111821'}
            stroke={index === 0 || index === points.length - 1 ? '#8b96a2' : '#72d5e8'}
            strokeWidth="3"
            tabIndex={index === 1 || index === 2 ? 0 : undefined}
            aria-label={index === 1 ? `阴影控制点 ${point.y}` : index === 2 ? `高光控制点 ${point.y}` : undefined}
            onPointerDown={(event) => {
              if (index === 0 || index === points.length - 1) return;
              activeIndex.current = index;
              event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
              updatePoint(event.clientY);
            }}
            onKeyDown={(event) => {
              if (index === 0 || index === points.length - 1) return;
              if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault();
                const delta = event.key === 'ArrowUp' ? 2 : -2;
                onChange(points.map((item, itemIndex) => itemIndex === index ? { ...item, y: Math.max(0, Math.min(255, item.y + delta)) } : item));
              }
            }}
          />
        ))}
      </svg>
      <div className="mt-2 flex justify-between font-mono text-[9px] text-muted-foreground"><span>阴影</span><span>中间调</span><span>高光</span></div>
    </div>
  );
}
