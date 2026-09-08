'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  FlaskConical,
  Plus,
  RotateCcw,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  describeMixedColor,
  getColorValues,
  getContrastTextColor,
  mixAdditiveLight,
  mixPigments,
} from '@/lib/color-mixing';
import type { MixerLessonDefinition, MixingInput } from '@/lib/types';

interface ColorMixerLessonProps {
  lesson: MixerLessonDefinition;
  completedExercises: string[];
  onExerciseComplete: (exerciseId: string) => void;
}

const DEFAULT_FREE_INPUTS: MixingInput[] = [
  {
    id: 'free-a',
    label: '颜色 A',
    color: '#FF0000',
    amount: 50,
    enabled: true,
  },
  {
    id: 'free-b',
    label: '颜色 B',
    color: '#00FF00',
    amount: 50,
    enabled: true,
  },
];

/** 根据课程模型选择加色或光谱减色算法。 */
function mixForLesson(
  lesson: MixerLessonDefinition,
  inputs: readonly MixingInput[],
): string {
  return lesson.model === 'additive-light'
    ? mixAdditiveLight(inputs)
    : mixPigments(inputs);
}

/** 混色章节的中栏实验区与右栏知识、练习面板。 */
export function ColorMixerLesson({
  lesson,
  completedExercises,
  onExerciseComplete,
}: ColorMixerLessonProps) {
  const firstIncomplete = Math.max(
    0,
    lesson.exercises.findIndex((item) => !completedExercises.includes(item.id)),
  );
  const [mode, setMode] = useState<'guided' | 'free'>('guided');
  const [currentExercise, setCurrentExercise] = useState(firstIncomplete);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [freeInputs, setFreeInputs] = useState<MixingInput[]>(() =>
    DEFAULT_FREE_INPUTS.map((input, index) => ({
      ...input,
      color: lesson.presets[index]?.color ?? input.color,
      label: lesson.presets[index]?.label ?? input.label,
      amount: lesson.model === 'additive-light' ? 100 : 50,
    })),
  );

  const exercise = lesson.exercises[currentExercise] ?? lesson.exercises[0];
  const guidedResult = useMemo(
    () => mixForLesson(lesson, exercise.inputs),
    [exercise, lesson],
  );
  const freeResult = useMemo(
    () => mixForLesson(lesson, freeInputs),
    [freeInputs, lesson],
  );
  const result = mode === 'guided' ? guidedResult : freeResult;
  const values = getColorValues(result);
  const description = describeMixedColor(result);
  const correct = selectedAnswer === exercise.correctAnswer;
  const chapterComplete = lesson.exercises.every((item) => completedExercises.includes(item.id));
  const exerciseDone = lesson.exercises.filter((item) =>
    completedExercises.includes(item.id),
  ).length;

  /** 提交预测；答对后立即保存本题进度，答错则保留重试入口。 */
  const chooseAnswer = (choiceId: string) => {
    setSelectedAnswer(choiceId);
    setRevealed(true);
    if (choiceId === exercise.correctAnswer) onExerciseComplete(exercise.id);
  };

  /** 进入下一道尚未完成的题；全部完成时切到自由模式并保留揭晓状态。 */
  const goNext = () => {
    if (chapterComplete) {
      setMode('free');
      return;
    }
    const incomplete = lesson.exercises
      .map((item, index) => ({ item, index }))
      .find(
        ({ item, index }) =>
          index > currentExercise && !completedExercises.includes(item.id),
      );
    const fallback = lesson.exercises.findIndex(
      (item) => !completedExercises.includes(item.id),
    );
    setCurrentExercise(
      incomplete?.index ?? (fallback >= 0 ? fallback : currentExercise),
    );
    setSelectedAnswer(null);
    setRevealed(false);
  };

  /** 更新一个自由混色槽，不把参数写入学习进度。 */
  const updateInput = (id: string, patch: Partial<MixingInput>) => {
    setFreeInputs((current) =>
      current.map((input) =>
        input.id === id ? { ...input, ...patch } : input,
      ),
    );
  };

  /** 将白、灰或黑加入第三槽；已有第三槽时直接替换，方便连续比较。 */
  const addNeutral = (label: string, color: string) => {
    setFreeInputs((current) => {
      const neutral: MixingInput = {
        id: 'free-c',
        label,
        color,
        amount: 50,
        enabled: true,
      };
      return current.length < 3
        ? [...current, neutral]
        : [...current.slice(0, 2), neutral];
    });
  };

  return (
    <>
      <section className="workbench" data-testid="mixer-workbench">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">
              {lesson.chapter} · {lesson.modelLabel}
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight lg:text-2xl">
              {lesson.title}
            </h1>
          </div>
          <div
            className="flex rounded-lg border border-white/10 bg-black/15 p-1"
            role="tablist"
            aria-label="混色学习模式"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'guided'}
              className={`rounded-md px-3 py-1.5 text-xs ${mode === 'guided' ? 'bg-cyan-300/15 text-cyan-100' : 'text-muted-foreground'}`}
              onClick={() => setMode('guided')}
            >
              预测练习
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'free'}
              className={`rounded-md px-3 py-1.5 text-xs ${mode === 'free' ? 'bg-cyan-300/15 text-cyan-100' : 'text-muted-foreground'}`}
              onClick={() => setMode('free')}
            >
              自由调色盘
            </button>
          </div>
        </div>

        {mode === 'guided' ? (
          <div>
            <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                预测练习 {currentExercise + 1} / {lesson.exercises.length}
              </span>
              <span>{exerciseDone} 题已完成</span>
            </div>
            <h2 className="mb-5 text-base font-medium">{exercise.prompt}</h2>
            {exercise.comparisons ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {exercise.comparisons.map((comparison) => (
                  <div key={comparison.label} className="mixer-slot">
                    <p className="mb-2 text-xs">{comparison.inputs.map((input) => input.label).join(' + ')} · 等份</p>
                    <div className="flex h-20 overflow-hidden rounded-xl">
                      {comparison.inputs.map((input) => <span key={input.id} className="flex-1" style={{ backgroundColor: input.color }} />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
              {exercise.inputs.map((input, index) => (
                <div className="contents" key={input.id}>
                  <div className="mixer-slot">
                    <span
                      className="h-28 rounded-xl border border-white/10"
                      style={{ backgroundColor: input.color }}
                    />
                    <span className="mt-3 text-sm font-medium">
                      {input.label}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {input.color} · {input.amount}
                      {lesson.model === 'additive-light' ? '%' : ' 份'}
                    </span>
                  </div>
                  {index < exercise.inputs.length - 1 && (
                    <span
                      className="self-center text-xl text-muted-foreground"
                      aria-hidden="true"
                    >
                      ＋
                    </span>
                  )}
                </div>
              ))}
            </div>}
            <div className="my-5 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-white/8" />
              <FlaskConical className="size-5 text-cyan-300" />
              <span className="h-px flex-1 bg-white/8" />
            </div>
            {revealed && exercise.comparisons ? (
              <div className="grid gap-3 sm:grid-cols-3" data-testid="comparison-results">
                {exercise.comparisons.map((comparison) => {
                  const color = mixForLesson(lesson, comparison.inputs);
                  return <div key={comparison.label} className="mixer-slot">
                    <div className="grid h-28 place-items-center rounded-xl px-2 text-center text-sm" style={{ backgroundColor: color, color: getContrastTextColor(color) }}>{comparison.label}</div>
                    <p className="mt-2 text-xs">{color} · {describeMixedColor(color).name}</p>
                  </div>;
                })}
              </div>
            ) : <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-center">
              <div
                data-testid="guided-result"
                className="grid h-36 place-items-center rounded-xl border border-white/10 text-3xl font-semibold"
                style={{
                  backgroundColor: revealed ? result : '#171B21',
                  color:
                    revealed ? getContrastTextColor(result) : '#FFFFFF',
                }}
              >
                {revealed ? exercise.resultLabel : '？'}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {revealed
                  ? `${result} · ${description.name}`
                  : '先选择答案，真实结果暂时隐藏'}
              </p>
            </div>}
          </div>
        ) : (
          <div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,.65fr)]">
              <div className="space-y-3">
                {freeInputs.map((input, index) => (
                  <div
                    key={input.id}
                    className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"
                    data-testid="free-color-slot"
                  >
                    <div className="flex items-center gap-3">
                      <label
                        className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-white/15"
                        style={{ backgroundColor: input.color }}
                      >
                        <span className="sr-only">选择{input.label}</span>
                        <input
                          aria-label={`选择${input.label}`}
                          className="absolute inset-0 size-full cursor-pointer opacity-0"
                          type="color"
                          value={input.color}
                          onChange={(event) =>
                            updateInput(input.id, {
                              color: event.target.value.toUpperCase(),
                              label: `自定义颜色 ${String.fromCharCode(65 + index)}`,
                            })
                          }
                        />
                      </label>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium">
                            {input.label}
                          </span>
                          <output className="font-mono text-[11px] text-cyan-300">
                            {input.amount}
                            {lesson.model === 'additive-light' ? '%' : ' 份'}
                          </output>
                        </div>
                        <Slider
                          className="mt-3"
                          value={[input.amount]}
                          min={0}
                          max={100}
                          onValueChange={(next) =>
                            updateInput(input.id, {
                              amount: Array.isArray(next) ? next[0] : next,
                            })
                          }
                          aria-label={`${input.label}${lesson.model === 'additive-light' ? '强度' : '份数'}`}
                        />
                      </div>
                      {index === 2 && (
                        <Button
                          aria-label="删除第三种颜色"
                          size="icon-sm"
                          variant="ghost"
                          onClick={() =>
                            setFreeInputs((current) => current.slice(0, 2))
                          }
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </div>
                    <div
                      className="mt-3 flex flex-wrap gap-1.5"
                      aria-label={`${input.label}预设`}
                    >
                      {lesson.presets.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          aria-label={`${input.label}使用${preset.label}`}
                          title={preset.label}
                          onClick={() =>
                            updateInput(input.id, {
                              label: preset.label,
                              color: preset.color,
                            })
                          }
                          className="size-6 rounded-full border border-white/15 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-cyan-300"
                          style={{ backgroundColor: preset.color }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {freeInputs.length < 3 && (
                  <Button
                    data-testid="add-third-color"
                    variant="outline"
                    className="w-full border-dashed border-white/15 bg-white/[0.02]"
                    onClick={() =>
                      setFreeInputs((current) => [
                        ...current,
                        {
                          id: 'free-c',
                          label: lesson.presets[2]?.label ?? '颜色 C',
                          color: lesson.presets[2]?.color ?? '#0000FF',
                          amount: lesson.model === 'additive-light' ? 100 : 50,
                          enabled: true,
                        },
                      ])
                    }
                  >
                    <Plus />
                    添加第三种颜色
                  </Button>
                )}
                {lesson.model === 'spectral-pigment' && (
                  <div className="rounded-xl border border-white/8 bg-black/10 p-3">
                    <p className="mb-2 text-[11px] text-muted-foreground">
                      快速比较综合色调
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => addNeutral('白色', '#FFFFFF')}
                      >
                        加入白色 · Tint
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => addNeutral('中灰', '#808080')}
                      >
                        加入灰色 · Tone
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => addNeutral('黑色', '#000000')}
                      >
                        加入黑色 · Shade
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <div
                  className="h-56 rounded-xl border border-white/10"
                  style={{ backgroundColor: result }}
                  aria-label={`混合结果 ${result}`}
                />
                <h2 className="mt-4 text-lg font-semibold">
                  {description.name}
                </h2>
                <dl className="mt-3 grid grid-cols-[3rem_1fr] gap-x-3 gap-y-2 text-xs">
                  <dt className="text-muted-foreground">HEX</dt>
                  <dd className="font-mono">{values.hex}</dd>
                  <dt className="text-muted-foreground">RGB</dt>
                  <dd className="font-mono">{values.rgb.join(', ')}</dd>
                  <dt className="text-muted-foreground">HSL</dt>
                  <dd className="font-mono">
                    {Math.round(values.hsl[0])}°,{' '}
                    {Math.round(values.hsl[1] * 100)}%,{' '}
                    {Math.round(values.hsl[2] * 100)}%
                  </dd>
                  <dt className="text-muted-foreground">特征</dt>
                  <dd>
                    {description.temperature} · {description.brightness} ·{' '}
                    {description.chroma}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        )}
      </section>

      <aside className="control-panel">
        <div>
          <p className="eyebrow">知识卡</p>
          <h2 className="mt-2 text-base font-semibold">
            {lesson.conceptTitle}
          </h2>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            {lesson.concept}
          </p>
        </div>
        <div className="spectrum-line" aria-hidden="true" />
        {mode === 'guided' ? (
          <div>
            <p className="eyebrow mb-3">选择你的预测</p>
            <fieldset className="space-y-2">
              <legend className="sr-only">候选综合色</legend>
              {exercise.choices.map((choice) => {
                const selected = selectedAnswer === choice.id;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    aria-pressed={selected}
                    disabled={revealed}
                    onClick={() => chooseAnswer(choice.id)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-cyan-300 ${selected ? 'border-cyan-300/40 bg-cyan-300/[0.08]' : 'border-white/8 bg-white/[0.025] hover:bg-white/[0.05]'}`}
                  >
                    <span className="flex items-center gap-3">
                      {choice.swatches ? (
                        <span className="flex h-9 w-16 overflow-hidden rounded-md border border-white/10">
                          {choice.swatches.map((color) => (
                            <span
                              key={color}
                              className="flex-1"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </span>
                      ) : (
                        <span
                          className="size-9 rounded-md border border-white/10"
                          style={{ backgroundColor: choice.color }}
                        />
                      )}
                      <span className="text-xs font-medium">
                        {choice.label}
                      </span>
                    </span>
                  </button>
                );
              })}
            </fieldset>
            {revealed && (
              <div
                aria-live="polite"
                className={`mt-4 rounded-xl border p-3 text-xs leading-5 ${correct ? 'border-emerald-300/20 bg-emerald-300/[0.06]' : 'border-rose-300/20 bg-rose-300/[0.06]'}`}
              >
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  {correct ? (
                    <CheckCircle2 className="size-4 text-emerald-300" />
                  ) : (
                    <XCircle className="size-4 text-rose-300" />
                  )}
                  {correct ? '预测正确' : '这次没有猜中'}
                </div>
                <p className="text-muted-foreground">{exercise.explanation}</p>
                <Button
                  className="mt-3"
                  size="sm"
                  variant={correct ? 'default' : 'outline'}
                  onClick={
                    correct
                      ? goNext
                      : () => {
                          setSelectedAnswer(null);
                          setRevealed(false);
                        }
                  }
                >
                  {correct ? (chapterComplete ? '进入自由调色盘' : '下一题') : '再试一次'}
                </Button>
              </div>
            )}
            {lesson.exercises.every((item) =>
              completedExercises.includes(item.id),
            ) && (
              <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-xs text-amber-100">
                本章三题已完成。切到自由调色盘，把结论变成自己的视觉经验。
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 text-xs leading-6 text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">观察重点</p>
              <p>{lesson.observe}</p>
            </div>
            <div>
              <p className="font-medium text-foreground">常见误区</p>
              <p>{lesson.mistake}</p>
            </div>
            <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] p-3">
              <p className="font-medium text-cyan-100">自由模式不计分</p>
              <p className="mt-1">
                颜色槽与答案不会保存；你的课程完成状态只来自三道预测练习。
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setFreeInputs(
                  DEFAULT_FREE_INPUTS.map((input, index) => ({
                    ...input,
                    color: lesson.presets[index]?.color ?? input.color,
                    label: lesson.presets[index]?.label ?? input.label,
                    amount: lesson.model === 'additive-light' ? 100 : 50,
                  })),
                )
              }
            >
              <RotateCcw />
              复位调色盘
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}
