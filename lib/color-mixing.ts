import { Color, mix } from 'spectral.js';
import { rgbToHsl } from './color-engine';
import type { MixingInput } from './types';

export interface ColorValues {
  hex: string;
  rgb: [number, number, number];
  hsl: [number, number, number];
}

export interface MixedColorDescription {
  name: string;
  hueName: string;
  temperature: '暖' | '冷' | '中性';
  brightness: '深色' | '中明度' | '浅色';
  chroma: '灰阶' | '灰调' | '柔和' | '鲜明';
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** 按线性 sRGB 相对亮度选择对比度更高的黑色或白色文字。 */
export function getContrastTextColor(hex: string): string {
  const [r, g, b] = parseHex(hex).map(srgbToLinear);
  // 黑白文字的对比度分别为 (L + 0.05) / 0.05 和 1.05 / (L + 0.05)。
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? '#000000' : '#FFFFFF';
}

/** 将 #RRGGBB 转换为 0～1 的 sRGB 通道。 */
function parseHex(hex: string): [number, number, number] {
  const normalized = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) throw new Error(`无效颜色：${hex}`);
  return [
    Number.parseInt(normalized.slice(0, 2), 16) / 255,
    Number.parseInt(normalized.slice(2, 4), 16) / 255,
    Number.parseInt(normalized.slice(4, 6), 16) / 255,
  ];
}

/** 将 0～1 的 sRGB 通道转换为大写 HEX。 */
function toHex(rgb: [number, number, number]): string {
  const channel = (value: number) =>
    Math.round(clamp01(value) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${channel(rgb[0])}${channel(rgb[1])}${channel(rgb[2])}`;
}

/** sRGB 解码到线性光空间，供光能量相加。 */
export function srgbToLinear(value: number): number {
  const channel = clamp01(value);
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

/** 线性光编码回 sRGB，供屏幕显示。 */
export function linearToSrgb(value: number): number {
  const channel = clamp01(value);
  return channel <= 0.0031308
    ? channel * 12.92
    : 1.055 * channel ** (1 / 2.4) - 0.055;
}

/**
 * 按独立强度混合 RGB 光。
 * 先在线性空间累加各光源能量，超过 1 的通道裁剪后再编码为 sRGB。
 */
export function mixAdditiveLight(inputs: readonly MixingInput[]): string {
  const linear: [number, number, number] = [0, 0, 0];
  for (const input of inputs.filter((item) => item.enabled)) {
    const rgb = parseHex(input.color);
    const intensity = Math.max(0, input.amount) / 100;
    for (let channel = 0; channel < 3; channel += 1) {
      linear[channel] += srgbToLinear(rgb[channel]) * intensity;
    }
  }
  return toHex(
    linear.map((value) => linearToSrgb(clamp01(value))) as [
      number,
      number,
      number,
    ],
  );
}

/**
 * 使用 Spectral.js 的 Kubelka–Munk 光谱近似混合颜料。
 * 有效份数会先归一化；全部为零时使用等份，保证结果稳定且可解释。
 */
export function mixPigments(inputs: readonly MixingInput[]): string {
  const active = inputs.filter((item) => item.enabled);
  if (active.length === 0) return '#000000';
  const positiveTotal = active.reduce(
    (sum, item) => sum + Math.max(0, item.amount),
    0,
  );
  const fallbackWeight = 1 / active.length;
  const weighted = active.map(
    (item) =>
      [
        new Color(item.color),
        positiveTotal === 0
          ? fallbackWeight
          : Math.max(0, item.amount) / positiveTotal,
      ] as [InstanceType<typeof Color>, number],
  );
  return mix(...weighted)
    .toString()
    .toUpperCase();
}

/** 返回统一格式的 HEX、RGB 和 HSL 数值，便于自由调色盘展示。 */
export function getColorValues(hex: string): ColorValues {
  const normalized = toHex(parseHex(hex));
  const unitRgb = parseHex(normalized);
  const hsl = rgbToHsl(...unitRgb);
  return {
    hex: normalized,
    rgb: unitRgb.map((value) => Math.round(value * 255)) as [
      number,
      number,
      number,
    ],
    hsl,
  };
}

/** 按固定边界把综合色描述为中文色名、冷暖、明暗与鲜灰程度。 */
export function describeMixedColor(hex: string): MixedColorDescription {
  const [, , lightness] = getColorValues(hex).hsl;
  const [hue, saturation] = getColorValues(hex).hsl;
  if (lightness <= 0.08)
    return {
      name: '黑色',
      hueName: '黑',
      temperature: '中性',
      brightness: '深色',
      chroma: '灰阶',
    };
  if (lightness >= 0.92)
    return {
      name: '白色',
      hueName: '白',
      temperature: '中性',
      brightness: '浅色',
      chroma: '灰阶',
    };

  const brightness =
    lightness < 0.35 ? '深色' : lightness > 0.7 ? '浅色' : '中明度';
  if (saturation < 0.08) {
    const name =
      brightness === '深色' ? '深灰' : brightness === '浅色' ? '浅灰' : '中灰';
    return {
      name,
      hueName: '灰',
      temperature: '中性',
      brightness,
      chroma: '灰阶',
    };
  }

  const hueName =
    hue < 15 || hue >= 345
      ? '红'
      : hue < 45
        ? '橙'
        : hue < 75
          ? '黄'
          : hue < 105
            ? '黄绿'
            : hue < 165
              ? '绿'
              : hue < 195
                ? '青'
                : hue < 255
                  ? '蓝'
                  : hue < 285
                    ? '紫'
                    : '洋红';
  const temperature = hue < 75 || hue >= 285 ? '暖' : '冷';
  const chroma =
    saturation < 0.25 ? '灰调' : saturation > 0.7 ? '鲜明' : '柔和';
  const brightnessPrefix =
    brightness === '深色' ? '深' : brightness === '浅色' ? '浅' : '';
  const chromaPrefix =
    chroma === '灰调' ? '灰' : chroma === '鲜明' ? '鲜' : '柔';
  return {
    name: `${brightnessPrefix}${temperature}${chromaPrefix}${hueName}调`,
    hueName,
    temperature,
    brightness,
    chroma,
  };
}
