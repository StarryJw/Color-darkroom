import { COLOR_BANDS } from './defaults';
import type { AdjustmentState, CurvePoint } from './types';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const clampByte = (value: number) => Math.min(255, Math.max(0, Math.round(value)));

/** 计算色轮上的最短角距离。 */
export function angularDistance(a: number, b: number): number {
  const difference = Math.abs(((a - b) % 360 + 360) % 360);
  return Math.min(difference, 360 - difference);
}

/** 将 sRGB 转为 HSL，返回值范围分别为 0-360、0-1、0-1。 */
export function rgbToHsl(red: number, green: number, blue: number): [number, number, number] {
  const r = clamp01(red);
  const g = clamp01(green);
  const b = clamp01(blue);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return [0, 0, lightness];

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (max === r) hue = 60 * (((g - b) / delta) % 6);
  else if (max === g) hue = 60 * ((b - r) / delta + 2);
  else hue = 60 * ((r - g) / delta + 4);
  return [hue < 0 ? hue + 360 : hue, saturation, lightness];
}

/** 将 HSL 转为 sRGB，输入色相为角度，其余值为 0-1。 */
export function hslToRgb(hue: number, saturation: number, lightness: number): [number, number, number] {
  const h = ((hue % 360) + 360) % 360;
  const s = clamp01(saturation);
  const l = clamp01(lightness);
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const section = h / 60;
  const x = chroma * (1 - Math.abs((section % 2) - 1));
  let rgb: [number, number, number];
  if (section < 1) rgb = [chroma, x, 0];
  else if (section < 2) rgb = [x, chroma, 0];
  else if (section < 3) rgb = [0, chroma, x];
  else if (section < 4) rgb = [0, x, chroma];
  else if (section < 5) rgb = [x, 0, chroma];
  else rgb = [chroma, 0, x];
  const match = l - chroma / 2;
  return [rgb[0] + match, rgb[1] + match, rgb[2] + match];
}

/** 六色带使用 60° 的软过渡，避免调整边缘发生颜色断层。 */
export function bandWeight(hue: number, center: number): number {
  return Math.max(0, 1 - angularDistance(hue, center) / 60);
}

/** 把曲线控制点线性插值为 256 项查找表。 */
export function buildCurveLut(points: CurvePoint[]): Uint8ClampedArray {
  const safePoints = [...points]
    .map((point) => ({ x: clampByte(point.x), y: clampByte(point.y) }))
    .sort((a, b) => a.x - b.x);
  if (safePoints.length === 0 || safePoints[0].x !== 0) safePoints.unshift({ x: 0, y: 0 });
  if (safePoints.at(-1)?.x !== 255) safePoints.push({ x: 255, y: 255 });

  const lut = new Uint8ClampedArray(256);
  let segment = 0;
  for (let x = 0; x < 256; x += 1) {
    while (segment < safePoints.length - 2 && x > safePoints[segment + 1].x) segment += 1;
    const left = safePoints[segment];
    const right = safePoints[segment + 1];
    const span = Math.max(1, right.x - left.x);
    const ratio = (x - left.x) / span;
    lut[x] = clampByte(left.y + (right.y - left.y) * ratio);
  }
  return lut;
}

/**
 * 依次执行白平衡、全局 HSL、分颜色 HSL、曲线和分离色调。
 * 输入数组不会被修改，便于随时回到原图。
 */
export function applyAdjustments(source: Uint8ClampedArray, state: AdjustmentState): Uint8ClampedArray {
  const output = new Uint8ClampedArray(source.length);
  const lut = buildCurveLut(state.curve);
  const temperature = (state.temperature / 100) * 0.18;
  const tint = (state.tint / 100) * 0.12;
  const shadowColor = hslToRgb(state.shadows.hue, 0.55, 0.5);
  const highlightColor = hslToRgb(state.highlights.hue, 0.5, 0.56);

  for (let index = 0; index < source.length; index += 4) {
    // 白平衡先在归一化 RGB 上做小幅通道增益。
    let red = clamp01(source[index] / 255 + temperature + tint * 0.45);
    let green = clamp01(source[index + 1] / 255 - tint);
    let blue = clamp01(source[index + 2] / 255 - temperature + tint * 0.45);

    let [hue, saturation, lightness] = rgbToHsl(red, green, blue);
    hue = (hue + state.hue + 360) % 360;
    saturation = clamp01(saturation + state.saturation / 100);
    lightness = clamp01(lightness + state.lightness / 200);

    let hueShift = 0;
    let saturationShift = 0;
    let lightnessShift = 0;
    for (const band of COLOR_BANDS) {
      const weight = bandWeight(hue, band.center);
      const adjustment = state.bands[band.id];
      hueShift += adjustment.hue * weight;
      saturationShift += (adjustment.saturation / 100) * weight;
      lightnessShift += (adjustment.lightness / 200) * weight;
    }
    [red, green, blue] = hslToRgb(
      hue + hueShift,
      clamp01(saturation + saturationShift),
      clamp01(lightness + lightnessShift),
    );

    red = lut[clampByte(red * 255)] / 255;
    green = lut[clampByte(green * 255)] / 255;
    blue = lut[clampByte(blue * 255)] / 255;

    // 以相对亮度生成连续的阴影/高光权重，避免出现硬分界。
    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    const shadowMix = ((1 - luminance) ** 2 * state.shadows.amount) / 280;
    const highlightMix = (luminance ** 2 * state.highlights.amount) / 280;
    red = red * (1 - shadowMix) + shadowColor[0] * shadowMix;
    green = green * (1 - shadowMix) + shadowColor[1] * shadowMix;
    blue = blue * (1 - shadowMix) + shadowColor[2] * shadowMix;
    red = red * (1 - highlightMix) + highlightColor[0] * highlightMix;
    green = green * (1 - highlightMix) + highlightColor[1] * highlightMix;
    blue = blue * (1 - highlightMix) + highlightColor[2] * highlightMix;

    output[index] = clampByte(red * 255);
    output[index + 1] = clampByte(green * 255);
    output[index + 2] = clampByte(blue * 255);
    output[index + 3] = source[index + 3];
  }
  return output;
}
