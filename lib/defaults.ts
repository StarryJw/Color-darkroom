import type { AdjustmentState, ColorBand } from './types';

/** 第三章教学样片中主色与强调色的原始色相锚点。 */
export const DEFAULT_HARMONY_BASE = 195;
export const DEFAULT_HARMONY_ACCENT = 40;

export const COLOR_BANDS: Array<{ id: ColorBand; label: string; center: number; color: string }> = [
  { id: 'red', label: '红', center: 0, color: '#f15b5b' },
  { id: 'orange', label: '橙', center: 35, color: '#f29d49' },
  { id: 'yellow', label: '黄', center: 65, color: '#e8cc52' },
  { id: 'green', label: '绿', center: 125, color: '#61c879' },
  { id: 'aqua', label: '青', center: 185, color: '#52c8ce' },
  { id: 'blue', label: '蓝', center: 235, color: '#6588e9' },
];

/** 返回一份可安全修改的初始调色参数。 */
export function createDefaultAdjustments(): AdjustmentState {
  const emptyBand = () => ({ hue: 0, saturation: 0, lightness: 0 });
  return {
    hue: 0,
    saturation: 0,
    lightness: 0,
    temperature: 0,
    tint: 0,
    harmonyBase: DEFAULT_HARMONY_BASE,
    harmonyAccent: DEFAULT_HARMONY_ACCENT,
    bands: {
      red: emptyBand(),
      orange: emptyBand(),
      yellow: emptyBand(),
      green: emptyBand(),
      aqua: emptyBand(),
      blue: emptyBand(),
    },
    curve: [
      { x: 0, y: 0 },
      { x: 64, y: 64 },
      { x: 192, y: 192 },
      { x: 255, y: 255 },
    ],
    shadows: { hue: 210, amount: 0 },
    highlights: { hue: 38, amount: 0 },
  };
}
