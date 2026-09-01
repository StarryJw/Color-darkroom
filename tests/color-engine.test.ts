import { describe, expect, it } from 'vitest';
import { angularDistance, applyAdjustments, bandWeight, buildCurveLut, hslToRgb, rgbToHsl, scaleSaturation } from '../lib/color-engine';
import { createDefaultAdjustments } from '../lib/defaults';

describe('色彩基础计算', () => {
  it('计算跨越 0 度的最短角距离', () => {
    expect(angularDistance(350, 10)).toBe(20);
    expect(angularDistance(20, 200)).toBe(180);
  });

  it('RGB 与 HSL 转换可近似往返', () => {
    const hsl = rgbToHsl(0.7, 0.3, 0.2);
    const rgb = hslToRgb(...hsl);
    expect(rgb[0]).toBeCloseTo(0.7, 5);
    expect(rgb[1]).toBeCloseTo(0.3, 5);
    expect(rgb[2]).toBeCloseTo(0.2, 5);
  });

  it('按原有饱和度比例调整并保护中性灰', () => {
    expect(scaleSaturation(0, 100)).toBe(0);
    expect(scaleSaturation(0.4, 50)).toBeCloseTo(0.6, 5);
    expect(scaleSaturation(0.4, -100)).toBe(0);
  });

  it('色带中心权重最大并在 60 度外归零', () => {
    expect(bandWeight(120, 120)).toBe(1);
    expect(bandWeight(150, 120)).toBe(0.5);
    expect(bandWeight(181, 120)).toBe(0);
  });
});

describe('曲线与像素管线', () => {
  it('生成恒等曲线与插值曲线', () => {
    const identity = buildCurveLut([{ x: 0, y: 0 }, { x: 255, y: 255 }]);
    expect(identity[128]).toBe(128);
    const lifted = buildCurveLut([{ x: 0, y: 0 }, { x: 128, y: 192 }, { x: 255, y: 255 }]);
    expect(lifted[128]).toBe(192);
  });

  it('保持 alpha，增加饱和度后扩大颜色通道差异', () => {
    const source = new Uint8ClampedArray([150, 105, 105, 173]);
    const state = createDefaultAdjustments();
    state.saturation = 30;
    const result = applyAdjustments(source, state);
    expect(result[3]).toBe(173);
    expect(result[0] - result[1]).toBeGreaterThan(source[0] - source[1]);
  });

  it('全局与分颜色饱和度都不会给中性灰染色', () => {
    const source = new Uint8ClampedArray([128, 128, 128, 211]);
    const state = createDefaultAdjustments();
    state.saturation = 100;
    state.bands.red.saturation = 100;
    expect(applyAdjustments(source, state)).toEqual(source);
  });

  it('增加饱和度时低饱和颜色仍保持克制', () => {
    const source = new Uint8ClampedArray([130, 126, 128, 255]);
    const state = createDefaultAdjustments();
    state.saturation = 23;
    const result = applyAdjustments(source, state);
    const channels = [result[0], result[1], result[2]];
    expect(Math.max(...channels) - Math.min(...channels)).toBeLessThanOrEqual(6);
  });

  it('降低色温时蓝通道相对红通道增强', () => {
    const source = new Uint8ClampedArray([128, 128, 128, 255]);
    const state = createDefaultAdjustments();
    state.temperature = -30;
    const result = applyAdjustments(source, state);
    expect(result[2]).toBeGreaterThan(result[0]);
  });
});
