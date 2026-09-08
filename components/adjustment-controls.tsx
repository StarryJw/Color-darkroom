'use client';

import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { COLOR_BANDS } from '@/lib/defaults';
import type { AdjustmentState, ColorBand, PhotoLessonDefinition } from '@/lib/types';
import { ColorWheel } from './color-wheel';
import { ToneCurve } from './tone-curve';

interface ControlsProps {
  lesson: PhotoLessonDefinition;
  adjustments: AdjustmentState;
  onChange: (value: AdjustmentState) => void;
}

interface SliderFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  suffix?: string;
  onChange: (value: number) => void;
}

function SliderField({ label, value, min = -100, max = 100, suffix = '', onChange }: SliderFieldProps) {
  const formatted = `${value > 0 ? '+' : ''}${Math.round(value)}${suffix}`;
  return (
    <label className="block">
      <span className="mb-3 flex items-center justify-between text-xs">
        <span>{label}</span><output className="font-mono text-[11px] text-cyan-300">{formatted}</output>
      </span>
      <Slider value={[value]} min={min} max={max} onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)} aria-label={label} />
    </label>
  );
}

/** 根据章节切换调色控件，同时保持统一的 AdjustmentState。 */
export function AdjustmentControls({ lesson, adjustments, onChange }: ControlsProps) {
  const [selectedBand, setSelectedBand] = useState<ColorBand>('green');
  const band = adjustments.bands[selectedBand];

  if (lesson.controls === 'global') {
    return (
      <div className="space-y-6">
        <SliderField label="色相" value={adjustments.hue} min={-180} max={180} suffix="°" onChange={(hue) => onChange({ ...adjustments, hue })} />
        <SliderField label="饱和度" value={adjustments.saturation} onChange={(saturation) => onChange({ ...adjustments, saturation })} />
        <SliderField label="明度" value={adjustments.lightness} onChange={(lightness) => onChange({ ...adjustments, lightness })} />
      </div>
    );
  }

  if (lesson.controls === 'whiteBalance') {
    return (
      <div className="space-y-6">
        <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 via-zinc-200 to-amber-400" aria-hidden="true" />
        <SliderField label="色温 · 蓝—黄" value={adjustments.temperature} onChange={(temperature) => onChange({ ...adjustments, temperature })} />
        <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 via-zinc-200 to-fuchsia-500" aria-hidden="true" />
        <SliderField label="色调 · 绿—洋红" value={adjustments.tint} onChange={(tint) => onChange({ ...adjustments, tint })} />
      </div>
    );
  }

  if (lesson.controls === 'harmony') {
    return <ColorWheel base={adjustments.harmonyBase} accent={adjustments.harmonyAccent} onChange={(kind, value) => onChange({ ...adjustments, [kind === 'base' ? 'harmonyBase' : 'harmonyAccent']: value })} />;
  }

  if (lesson.controls === 'bands') {
    const updateBand = (property: keyof typeof band, value: number) => onChange({
      ...adjustments,
      bands: { ...adjustments.bands, [selectedBand]: { ...band, [property]: value } },
    });
    return (
      <div>
        <div className="mb-6 grid grid-cols-6 gap-1" role="tablist" aria-label="颜色范围">
          {COLOR_BANDS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selectedBand === item.id}
              onClick={() => setSelectedBand(item.id)}
              className={`rounded-lg border px-1 py-2 text-[10px] transition ${selectedBand === item.id ? 'border-white/25 bg-white/10 text-white' : 'border-transparent text-muted-foreground hover:bg-white/5'}`}
            >
              <span className="mx-auto mb-1 block size-2 rounded-full" style={{ backgroundColor: item.color }} />{item.label}
            </button>
          ))}
        </div>
        <div className="space-y-6">
          <SliderField label={`${COLOR_BANDS.find((item) => item.id === selectedBand)?.label}色色相`} value={band.hue} min={-60} max={60} suffix="°" onChange={(value) => updateBand('hue', value)} />
          <SliderField label="饱和度" value={band.saturation} onChange={(value) => updateBand('saturation', value)} />
          <SliderField label="明度" value={band.lightness} onChange={(value) => updateBand('lightness', value)} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToneCurve points={adjustments.curve} onChange={(curve) => onChange({ ...adjustments, curve })} />
      <div className="grid grid-cols-2 gap-3">
        <div className="text-[10px] text-muted-foreground">阴影色相
          <span className="mt-2 block h-8 w-full rounded border border-white/10" style={{ backgroundColor: `hsl(${adjustments.shadows.hue} 55% 50%)` }} aria-label="阴影色相示意" />
        </div>
        <div className="text-[10px] text-muted-foreground">高光色相
          <span className="mt-2 block h-8 w-full rounded border border-white/10" style={{ backgroundColor: `hsl(${adjustments.highlights.hue} 50% 56%)` }} aria-label="高光色相示意" />
        </div>
      </div>
      <SliderField label="阴影冷色强度" value={adjustments.shadows.amount} min={0} max={50} onChange={(amount) => onChange({ ...adjustments, shadows: { ...adjustments.shadows, amount } })} />
      <SliderField label="高光暖色强度" value={adjustments.highlights.amount} min={0} max={50} onChange={(amount) => onChange({ ...adjustments, highlights: { ...adjustments.highlights, amount } })} />
    </div>
  );
}
