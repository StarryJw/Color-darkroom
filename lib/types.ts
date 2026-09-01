export type ColorBand = 'red' | 'orange' | 'yellow' | 'green' | 'aqua' | 'blue';

export interface BandAdjustment {
  hue: number;
  saturation: number;
  lightness: number;
}

export interface CurvePoint {
  x: number;
  y: number;
}

/** 图像处理管线使用的全部非破坏式参数。 */
export interface AdjustmentState {
  hue: number;
  saturation: number;
  lightness: number;
  temperature: number;
  tint: number;
  harmonyBase: number;
  harmonyAccent: number;
  bands: Record<ColorBand, BandAdjustment>;
  curve: CurvePoint[];
  shadows: { hue: number; amount: number };
  highlights: { hue: number; amount: number };
}

export interface ParameterRule {
  kind: 'parameter';
  path: string;
  min: number;
  max: number;
  lowHint: string;
  highHint: string;
}

export interface HarmonyRule {
  kind: 'harmony';
  minDifference: number;
  maxDifference: number;
  hint: string;
}

export type TaskConstraint = ParameterRule | HarmonyRule;

/** 每章教学内容、控件范围与完成条件。 */
export interface LessonDefinition {
  id: string;
  chapter: string;
  title: string;
  shortTitle: string;
  sample: string;
  sampleAlt: string;
  sampleLabel: string;
  conceptTitle: string;
  concept: string;
  observe: string;
  mistake: string;
  task: string;
  success: string;
  controls: 'global' | 'whiteBalance' | 'harmony' | 'bands' | 'curve';
  constraints: TaskConstraint[];
}

/** 浏览器本地保存的学习进度。 */
export interface ProgressState {
  version: 1;
  currentLesson: string;
  completedLessons: string[];
  updatedAt: string;
}

export interface RenderInitMessage {
  type: 'init';
  width: number;
  height: number;
  buffer: ArrayBuffer;
}

export interface RenderRequest {
  type: 'render';
  requestId: number;
  adjustments: AdjustmentState;
}

export interface RenderResult {
  type: 'result';
  requestId: number;
  width: number;
  height: number;
  buffer: ArrayBuffer;
}

export interface RenderError {
  type: 'error';
  requestId: number;
  message: string;
}

export type WorkerRequest = RenderInitMessage | RenderRequest;
export type WorkerResponse = RenderResult | RenderError;
