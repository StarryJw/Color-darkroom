import { angularDistance } from './color-engine';
import type { AdjustmentState, MixerLessonDefinition, PhotoLessonDefinition, ProgressState } from './types';

export const PROGRESS_KEY = 'color-darkroom.progress.v2';
export const LEGACY_PROGRESS_KEY = 'color-darkroom.progress.v1';
export const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const MAX_IMAGE_FILE_SIZE = 25 * 1024 * 1024;

export interface TaskFeedback {
  status: 'idle' | 'close' | 'success';
  message: string;
}

/** 只接收浏览器可稳定解码的常见格式，并限制单文件内存压力。 */
export function validateImageFile(type: string, size: number): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(type)) return '请选择 JPEG、PNG 或 WebP 图片。';
  if (size > MAX_IMAGE_FILE_SIZE) return '图片超过 25 MB，请先缩小后再导入。';
  return null;
}

/** Worker 结果仅在仍是最新请求时才允许写回画布。 */
export function isLatestRender(requestId: number, latestRequestId: number): boolean {
  return requestId === latestRequestId;
}

/** 混色章节只在定义内的三道练习全部完成后才算完成。 */
export function isMixerLessonComplete(lesson: MixerLessonDefinition, completedExercises: readonly string[]): boolean {
  return lesson.exercises.every((exercise) => completedExercises.includes(exercise.id));
}

/** 读取点分隔路径，支持 curve.1.y 这类数组索引。 */
export function getNumericValue(source: unknown, path: string): number | undefined {
  let current: unknown = source;
  for (const part of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'number' ? current : undefined;
}

/** 根据课程规则给出即时、可行动的方向反馈。 */
export function evaluateTask(lesson: PhotoLessonDefinition, state: AdjustmentState, userPhoto: boolean): TaskFeedback {
  if (userPhoto) return { status: 'idle', message: '自由练习模式：观察变化，不设置标准答案。' };
  for (const constraint of lesson.constraints) {
    if (constraint.kind === 'harmony') {
      const difference = angularDistance(state.harmonyBase, state.harmonyAccent);
      if (difference < constraint.minDifference || difference > constraint.maxDifference) {
        return { status: 'close', message: `${constraint.hint} 当前相差 ${Math.round(difference)}°。` };
      }
      continue;
    }
    const value = getNumericValue(state, constraint.path);
    if (value === undefined) return { status: 'close', message: '当前参数暂时无法读取，请重置后重试。' };
    if (value < constraint.min) return { status: 'close', message: constraint.lowHint };
    if (value > constraint.max) return { status: 'close', message: constraint.highHint };
  }
  return { status: 'success', message: lesson.success };
}

/** 去重并过滤持久化数组中的非法或未知标识。 */
function sanitizeIds(value: unknown, allowed?: ReadonlySet<string>): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && (!allowed || allowed.has(item))))];
}

/**
 * 从 localStorage 文本中恢复 v2 进度；传入 v1 时迁移并保留原五章状态。
 * 允许列表由课程定义提供，避免损坏数据写回未知章节或练习。
 */
export function parseProgress(
  raw: string | null,
  fallbackLesson: string,
  validLessons?: readonly string[],
  validExercises?: readonly string[],
): ProgressState {
  const fallback: ProgressState = {
    version: 2,
    currentLesson: fallbackLesson,
    completedLessons: [],
    completedExercises: [],
    updatedAt: new Date(0).toISOString(),
  };
  if (!raw) return fallback;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if ((value.version !== 1 && value.version !== 2) || typeof value.currentLesson !== 'string') return fallback;
    const lessonSet = validLessons ? new Set(validLessons) : undefined;
    const exerciseSet = validExercises ? new Set(validExercises) : undefined;
    return {
      version: 2,
      currentLesson: !lessonSet || lessonSet.has(value.currentLesson) ? value.currentLesson : fallbackLesson,
      completedLessons: sanitizeIds(value.completedLessons, lessonSet),
      completedExercises: value.version === 2 ? sanitizeIds(value.completedExercises, exerciseSet) : [],
      updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : fallback.updatedAt,
    };
  } catch {
    return fallback;
  }
}
