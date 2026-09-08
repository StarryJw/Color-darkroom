import { describe, expect, it } from 'vitest';
import {
  describeMixedColor,
  getContrastTextColor,
  linearToSrgb,
  mixAdditiveLight,
  mixPigments,
  srgbToLinear,
} from '../lib/color-mixing';
import { hslToRgb } from '../lib/color-engine';
import { LESSONS } from '../lib/lessons';
import type { MixerLessonDefinition, MixingInput } from '../lib/types';

const input = (color: string, amount = 100, id = color): MixingInput => ({
  id,
  label: id,
  color,
  amount,
  enabled: true,
});

/** 将浮点 RGB 转成测试用 HEX。 */
function rgbHex(rgb: [number, number, number]): string {
  return `#${rgb
    .map((channel) =>
      Math.round(channel * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

describe('RGB 加色混合', () => {
  it('亮黄色、青色使用黑字，暗蓝色使用白字', () => {
    for (const color of ['#FFFF00', '#00FFFF', '#FFFFFF']) {
      expect(getContrastTextColor(color)).toBe('#000000');
    }
    for (const color of ['#0000FF', '#000000']) {
      expect(getContrastTextColor(color)).toBe('#FFFFFF');
    }
  });
  it('两两混合得到黄光和青光', () => {
    expect(mixAdditiveLight([input('#FF0000'), input('#00FF00')])).toBe(
      '#FFFF00',
    );
    expect(mixAdditiveLight([input('#00FF00'), input('#0000FF')])).toBe(
      '#00FFFF',
    );
  });

  it('三原色等强得到白光，零强度得到黑色', () => {
    expect(
      mixAdditiveLight([input('#FF0000'), input('#00FF00'), input('#0000FF')]),
    ).toBe('#FFFFFF');
    expect(mixAdditiveLight([input('#FFFFFF', 0), input('#FFFFFF', 0)])).toBe(
      '#000000',
    );
  });

  it('超出通道会裁剪，gamma 往返保持数值', () => {
    expect(mixAdditiveLight([input('#FFFFFF'), input('#FFFFFF')])).toBe(
      '#FFFFFF',
    );
    for (const channel of [0, 0.18, 0.5, 1]) {
      expect(linearToSrgb(srgbToLinear(channel))).toBeCloseTo(channel, 7);
    }
  });
});

describe('Spectral.js 颜料混合', () => {
  it('钴蓝与黄色等份混为绿色', () => {
    expect(mixPigments([input('#002185', 50), input('#FCD200', 50)])).toBe(
      '#3D933E',
    );
  });

  it('比例端点保持原色，三色混合稳定', () => {
    expect(mixPigments([input('#002185', 100), input('#FCD200', 0)])).toBe(
      '#002185',
    );
    expect(
      mixPigments([input('#FF0000'), input('#00FF00'), input('#0000FF')]),
    ).toBe('#593923');
  });

  it('全部零份时回退到等份', () => {
    const zero = mixPigments([input('#002185', 0), input('#FCD200', 0)]);
    const equal = mixPigments([input('#002185', 50), input('#FCD200', 50)]);
    expect(zero).toBe(equal);
  });
});

describe('综合色中文描述', () => {
  it('按明度边界识别黑、白与灰阶', () => {
    expect(describeMixedColor('#141414').name).toBe('黑色');
    expect(describeMixedColor('#EBEBEB').name).toBe('白色');
    expect(describeMixedColor('#808080')).toMatchObject({
      name: '中灰',
      temperature: '中性',
      chroma: '灰阶',
    });
  });

  it('按饱和度和明度边界标记灰调、鲜明、深色与浅色', () => {
    expect(describeMixedColor(rgbHex(hslToRgb(30, 0.24, 0.5))).chroma).toBe(
      '灰调',
    );
    expect(describeMixedColor(rgbHex(hslToRgb(30, 0.72, 0.5))).chroma).toBe(
      '鲜明',
    );
    expect(
      describeMixedColor(rgbHex(hslToRgb(220, 0.6, 0.34))).brightness,
    ).toBe('深色');
    expect(
      describeMixedColor(rgbHex(hslToRgb(220, 0.6, 0.72))).brightness,
    ).toBe('浅色');
  });

  it.each([
    [0, '红'],
    [30, '橙'],
    [60, '黄'],
    [90, '黄绿'],
    [130, '绿'],
    [180, '青'],
    [220, '蓝'],
    [270, '紫'],
    [315, '洋红'],
  ])('色相 %i° 归入%s区间', (hue, expected) => {
    expect(describeMixedColor(rgbHex(hslToRgb(hue, 0.6, 0.5))).hueName).toBe(
      expected,
    );
  });
});

describe('六道预测练习', () => {
  const mixerLessons = LESSONS.filter(
    (lesson): lesson is MixerLessonDefinition => lesson.kind === 'mixer',
  );

  it('每章正好三题，答案存在且解释完整', () => {
    expect(mixerLessons).toHaveLength(2);
    for (const lesson of mixerLessons) {
      expect(lesson.exercises).toHaveLength(3);
      for (const exercise of lesson.exercises) {
        expect(
          exercise.choices.some(
            (choice) => choice.id === exercise.correctAnswer,
          ),
        ).toBe(true);
        expect(exercise.explanation.length).toBeGreaterThan(12);
      }
    }
  });

  it('每题正确色块与实际混色结果一致', () => {
    for (const lesson of mixerLessons) {
      for (const exercise of lesson.exercises) {
        const actual =
          lesson.model === 'additive-light'
            ? mixAdditiveLight(exercise.inputs)
            : mixPigments(exercise.inputs);
        const answer = exercise.choices.find(
          (choice) => choice.id === exercise.correctAnswer,
        );
        expect(answer?.color.toUpperCase()).toBe(actual);
      }
    }
  });
});
