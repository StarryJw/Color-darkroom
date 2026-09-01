import { describe, expect, it } from 'vitest';
import { createDefaultAdjustments } from '../lib/defaults';
import { evaluateTask, isLatestRender, parseProgress, validateImageFile } from '../lib/learning';
import { LESSONS } from '../lib/lessons';

describe('课程任务反馈', () => {
  it('在边界值内判定第一章完成', () => {
    const state = createDefaultAdjustments();
    state.saturation = 20;
    state.lightness = 5;
    expect(evaluateTask(LESSONS[0], state, false).status).toBe('success');
    state.saturation = 19;
    expect(evaluateTask(LESSONS[0], state, false).status).toBe('close');
  });

  it('互补色按最短角距离判定', () => {
    const state = createDefaultAdjustments();
    state.harmonyBase = 350;
    state.harmonyAccent = 170;
    expect(evaluateTask(LESSONS[2], state, false).status).toBe('success');
  });

  it('用户照片始终进入自由练习', () => {
    expect(evaluateTask(LESSONS[0], createDefaultAdjustments(), true).status).toBe('idle');
  });
});

describe('进度、导入与竞态防护', () => {
  it('损坏进度安全回退', () => {
    const progress = parseProgress('{broken', LESSONS[0].id);
    expect(progress.currentLesson).toBe(LESSONS[0].id);
    expect(progress.completedLessons).toEqual([]);
  });

  it('恢复有效进度并过滤非字符串条目', () => {
    const raw = JSON.stringify({ version: 1, currentLesson: LESSONS[1].id, completedLessons: [LESSONS[0].id, 2], updatedAt: 'now' });
    const progress = parseProgress(raw, LESSONS[0].id);
    expect(progress.currentLesson).toBe(LESSONS[1].id);
    expect(progress.completedLessons).toEqual([LESSONS[0].id]);
  });

  it('验证图片格式与大小', () => {
    expect(validateImageFile('image/jpeg', 1024)).toBeNull();
    expect(validateImageFile('image/gif', 1024)).toContain('JPEG');
    expect(validateImageFile('image/png', 26 * 1024 * 1024)).toContain('25 MB');
  });

  it('只接受最新 Worker 请求结果', () => {
    expect(isLatestRender(8, 8)).toBe(true);
    expect(isLatestRender(7, 8)).toBe(false);
  });
});
