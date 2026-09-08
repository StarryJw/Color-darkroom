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

/** 所有课程共用的导航与知识卡信息。 */
interface BaseLessonDefinition {
  id: string;
  chapter: string;
  title: string;
  shortTitle: string;
  conceptTitle: string;
  concept: string;
  observe: string;
  mistake: string;
  task: string;
}

/** 原有五章照片课程的样片、控件范围与完成条件。 */
export interface PhotoLessonDefinition extends BaseLessonDefinition {
  kind: 'photo';
  sample: string;
  sampleAlt: string;
  sampleLabel: string;
  success: string;
  controls: 'global' | 'whiteBalance' | 'harmony' | 'bands' | 'curve';
  constraints: TaskConstraint[];
}

export type MixingModel = 'additive-light' | 'spectral-pigment';

/** 混色槽的颜色、强度或颜料份数。 */
export interface MixingInput {
  id: string;
  label: string;
  color: string;
  amount: number;
  enabled: boolean;
}

export interface MixingChoice {
  id: string;
  label: string;
  color: string;
  swatches?: string[];
}

/** 一道固定输入、候选答案和讲解齐全的预测练习。 */
export interface MixingExercise {
  id: string;
  prompt: string;
  inputs: MixingInput[];
  choices: MixingChoice[];
  correctAnswer: string;
  resultLabel: string;
  explanation: string;
  /** 同一基色的多组对照配方；答案揭晓后分别计算并展示。 */
  comparisons?: Array<{ label: string; inputs: MixingInput[] }>;
}

/** 第六、七章独立混色工作台所需的课程定义。 */
export interface MixerLessonDefinition extends BaseLessonDefinition {
  kind: 'mixer';
  model: MixingModel;
  modelLabel: string;
  exercises: MixingExercise[];
  presets: Array<{ label: string; color: string }>;
}

/** 课程定义以 kind 区分照片调节与混色实验，避免污染 AdjustmentState。 */
export type LessonDefinition = PhotoLessonDefinition | MixerLessonDefinition;

/** 混色工作台的短期交互状态；颜色槽与当前答案不会持久化。 */
export interface MixingState {
  mode: 'guided' | 'free';
  inputs: MixingInput[];
  currentExercise: number;
  selectedAnswer: string | null;
  revealed: boolean;
}

/** 浏览器本地保存的 v2 学习进度。 */
export interface ProgressState {
  version: 2;
  currentLesson: string;
  completedLessons: string[];
  completedExercises: string[];
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
