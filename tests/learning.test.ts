import { describe, expect, it } from 'vitest';
import { createDefaultAdjustments } from '../lib/defaults';
import { evaluateTask, isLatestRender, isMixerLessonComplete, parseProgress, validateImageFile } from '../lib/learning';
import { LESSONS } from '../lib/lessons';
import type { PhotoLessonDefinition } from '../lib/types';

const PHOTO_LESSONS = LESSONS.filter((lesson): lesson is PhotoLessonDefinition => lesson.kind === 'photo');

describe('课程任务反馈', () => {
  it('在边界值内判定第一章完成', () => {
    const state = createDefaultAdjustments();
    state.saturation = 20;
    state.lightness = 5;
    expect(evaluateTask(PHOTO_LESSONS[0], state, false).status).toBe('success');
    state.saturation = 19;
    expect(evaluateTask(PHOTO_LESSONS[0], state, false).status).toBe('close');
  });

  it('互补色按最短角距离判定', () => {
    const state = createDefaultAdjustments();
    state.harmonyBase = 350;
    state.harmonyAccent = 170;
    expect(evaluateTask(PHOTO_LESSONS[2], state, false).status).toBe('success');
  });

  it('用户照片始终进入自由练习', () => {
    expect(evaluateTask(PHOTO_LESSONS[0], createDefaultAdjustments(), true).status).toBe('idle');
  });

  it('混色章节必须完成全部三题', () => {
    const mixer = LESSONS.find((lesson) => lesson.kind === 'mixer');
    if (!mixer || mixer.kind !== 'mixer') throw new Error('缺少混色课程');
    expect(isMixerLessonComplete(mixer, mixer.exercises.slice(0, 2).map((exercise) => exercise.id))).toBe(false);
    expect(isMixerLessonComplete(mixer, mixer.exercises.map((exercise) => exercise.id))).toBe(true);
  });
});

describe('进度、导入与竞态防护', () => {
  it('损坏进度安全回退', () => {
    const progress = parseProgress('{broken', LESSONS[0].id);
    expect(progress.currentLesson).toBe(LESSONS[0].id);
    expect(progress.completedLessons).toEqual([]);
  });

  it('把 v1 进度迁移为 v2 并保留五章状态', () => {
    const raw = JSON.stringify({ version: 1, currentLesson: LESSONS[1].id, completedLessons: [LESSONS[0].id, 2], updatedAt: 'now' });
    const progress = parseProgress(raw, LESSONS[0].id);
    expect(progress.version).toBe(2);
    expect(progress.currentLesson).toBe(LESSONS[1].id);
    expect(progress.completedLessons).toEqual([LESSONS[0].id]);
    expect(progress.completedExercises).toEqual([]);
  });

  it('恢复 v2 逐题进度并过滤未知与重复 ID', () => {
    const validLessons = LESSONS.map((lesson) => lesson.id);
    const validExercises = LESSONS.flatMap((lesson) => lesson.kind === 'mixer' ? lesson.exercises.map((exercise) => exercise.id) : []);
    const raw = JSON.stringify({
      version: 2,
      currentLesson: 'missing',
      completedLessons: [LESSONS[0].id, LESSONS[0].id, 'missing'],
      completedExercises: [validExercises[0], validExercises[0], 'missing', 3],
    });
    const progress = parseProgress(raw, LESSONS[0].id, validLessons, validExercises);
    expect(progress.currentLesson).toBe(LESSONS[0].id);
    expect(progress.completedLessons).toEqual([LESSONS[0].id]);
    expect(progress.completedExercises).toEqual([validExercises[0]]);
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
