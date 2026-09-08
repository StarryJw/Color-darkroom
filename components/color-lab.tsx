'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCircle2, ChevronRight, Circle, Eye, ImagePlus, LoaderCircle, RotateCcw, Sparkles, Upload, X } from 'lucide-react';
import { AdjustmentControls } from '@/components/adjustment-controls';
import { ColorMixerLesson } from '@/components/color-mixer-lesson';
import { Button } from '@/components/ui/button';
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { createDefaultAdjustments } from '@/lib/defaults';
import { evaluateTask, isLatestRender, isMixerLessonComplete, LEGACY_PROGRESS_KEY, parseProgress, PROGRESS_KEY, validateImageFile } from '@/lib/learning';
import { LESSONS } from '@/lib/lessons';
import type { AdjustmentState, ProgressState, WorkerResponse } from '@/lib/types';
// Vite 会在构建时为 ?worker 模块生成默认导出的 Worker 构造器。
// oxlint-disable-next-line import/default
import ImageWorker from '@/workers/image-worker.ts?worker';

/** 色彩暗房的完整单页学习工作台。 */
export function ColorLab() {
  const [currentLessonId, setCurrentLessonId] = useState(LESSONS[0].id);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [adjustments, setAdjustments] = useState<AdjustmentState>(() => createDefaultAdjustments());
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [userPhotoName, setUserPhotoName] = useState('');
  const [comparePosition, setComparePosition] = useState(100);
  const [showOriginal, setShowOriginal] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(3 / 2);
  const [imageError, setImageError] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const adjustedCanvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestRef = useRef(0);
  const renderInFlightRef = useRef(false);
  const pendingRenderRef = useRef<AdjustmentState | null>(null);
  const sendRenderRef = useRef<(state: AdjustmentState) => void>(() => undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lesson = LESSONS.find((item) => item.id === currentLessonId) ?? LESSONS[0];
  const photoLesson = lesson.kind === 'photo' ? lesson : null;
  const sourceUrl = photoLesson ? userPhotoUrl ?? photoLesson.sample : null;
  const feedback = useMemo(() => photoLesson ? evaluateTask(photoLesson, adjustments, Boolean(userPhotoUrl)) : { status: 'idle' as const, message: '' }, [photoLesson, adjustments, userPhotoUrl]);
  const completionPercent = (completedLessons.length / LESSONS.length) * 100;

  useEffect(() => {
    const validLessons = LESSONS.map((item) => item.id);
    const validExercises = LESSONS.flatMap((item) => item.kind === 'mixer' ? item.exercises.map((exercise) => exercise.id) : []);
    const saved = parseProgress(localStorage.getItem(PROGRESS_KEY) ?? localStorage.getItem(LEGACY_PROGRESS_KEY), LESSONS[0].id, validLessons, validExercises);
    setCurrentLessonId(saved.currentLesson);
    setCompletedExercises(saved.completedExercises);
    // 混色章节只有在三道题都完成时才可恢复为完成状态。
    setCompletedLessons(saved.completedLessons.filter((id) => {
      const savedLesson = LESSONS.find((item) => item.id === id);
      return savedLesson?.kind === 'photo' || (savedLesson?.kind === 'mixer' && isMixerLessonComplete(savedLesson, saved.completedExercises));
    }));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const progress: ProgressState = { version: 2, currentLesson: currentLessonId, completedLessons, completedExercises, updatedAt: new Date().toISOString() };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }, [completedExercises, completedLessons, currentLessonId, hydrated]);

  useEffect(() => {
    if (lesson.kind !== 'photo') {
      workerRef.current = null;
      sendRenderRef.current = () => undefined;
      return;
    }
    const worker = new ImageWorker();
    workerRef.current = worker;

    /** 向 Worker 发送一次渲染，并标记当前仅有的处理中任务。 */
    const sendRender = (state: AdjustmentState) => {
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;
      renderInFlightRef.current = true;
      setRendering(true);
      worker.postMessage({ type: 'render', requestId, adjustments: state });
    };
    sendRenderRef.current = sendRender;

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      const isLatest = isLatestRender(message.requestId, requestRef.current);
      renderInFlightRef.current = false;

      // 连续拖动时只保留最新参数，避免 Worker 逐个计算已经过时的中间值。
      const pending = pendingRenderRef.current;
      if (pending) {
        pendingRenderRef.current = null;
        sendRender(pending);
        return;
      }

      setRendering(false);
      if (!isLatest) return;
      if (message.type === 'error') return setImageError(message.message);
      const canvas = adjustedCanvasRef.current;
      if (!canvas) return;
      canvas.width = message.width;
      canvas.height = message.height;
      canvas.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(message.buffer), message.width, message.height), 0, 0);
    };
    worker.onerror = () => {
      renderInFlightRef.current = false;
      pendingRenderRef.current = null;
      setRendering(false);
      setImageError('图像处理线程运行失败，请刷新页面后重试');
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
      sendRenderRef.current = () => undefined;
      renderInFlightRef.current = false;
      pendingRenderRef.current = null;
    };
  }, [lesson.kind]);

  useEffect(() => {
    if (!sourceUrl || lesson.kind !== 'photo') {
      requestRef.current += 1;
      pendingRenderRef.current = null;
      setImageReady(false);
      setRendering(false);
      return;
    }
    let cancelled = false;
    requestRef.current += 1;
    pendingRenderRef.current = null;
    setImageReady(false);
    setImageError('');
    const loadImage = async () => {
      try {
        const response = await fetch(sourceUrl);
        if (!response.ok) throw new Error('教学样片加载失败');
        const bitmap = await createImageBitmap(await response.blob(), { imageOrientation: 'from-image' });
        if (cancelled) return bitmap.close();
        const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));
        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = width;
        sourceCanvas.height = height;
        const context = sourceCanvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('浏览器无法创建图像画布');
        context.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        const pixels = context.getImageData(0, 0, width, height);
        setAspectRatio(width / height);
        for (const canvas of [originalCanvasRef.current, adjustedCanvasRef.current]) {
          if (!canvas) continue;
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d')?.putImageData(pixels, 0, 0);
        }
        const buffer = pixels.data.slice().buffer as ArrayBuffer;
        workerRef.current?.postMessage({ type: 'init', width, height, buffer }, [buffer]);
        setImageReady(true);
      } catch (error) {
        if (!cancelled) setImageError(error instanceof Error ? error.message : '图片加载失败');
      }
    };
    void loadImage();
    return () => { cancelled = true; };
  }, [lesson.kind, sourceUrl]);

  useEffect(() => () => {
    if (userPhotoUrl) URL.revokeObjectURL(userPhotoUrl);
  }, [userPhotoUrl]);

  useEffect(() => {
    if (!imageReady || lesson.kind !== 'photo') return;
    if (renderInFlightRef.current) {
      pendingRenderRef.current = adjustments;
      setRendering(true);
      return;
    }
    sendRenderRef.current(adjustments);
  }, [adjustments, imageReady, lesson.kind]);

  useEffect(() => {
    if (lesson.kind === 'photo' && feedback.status === 'success' && !userPhotoUrl) {
      setCompletedLessons((current) => current.includes(lesson.id) ? current : [...current, lesson.id]);
    }
  }, [feedback.status, lesson, userPhotoUrl]);

  /** 逐题保存混色练习，并仅在三题全部完成后标记对应章节。 */
  const handleExerciseComplete = useCallback((lessonId: string, exerciseId: string) => {
    setCompletedExercises((current) => {
      const next = current.includes(exerciseId) ? current : [...current, exerciseId];
      const target = LESSONS.find((item) => item.id === lessonId);
      if (target?.kind === 'mixer' && isMixerLessonComplete(target, next)) {
        setCompletedLessons((lessons) => lessons.includes(lessonId) ? lessons : [...lessons, lessonId]);
      }
      return next;
    });
  }, []);

  const chooseLesson = useCallback((lessonId: string) => {
    setCurrentLessonId(lessonId);
    setAdjustments(createDefaultAdjustments());
    setComparePosition(100);
    setImageError('');
  }, []);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const validationError = validateImageFile(file.type, file.size);
    if (validationError) return setImageError(validationError);
    if (userPhotoUrl) URL.revokeObjectURL(userPhotoUrl);
    setUserPhotoUrl(URL.createObjectURL(file));
    setUserPhotoName(file.name);
    setAdjustments(createDefaultAdjustments());
    setImageError('');
  };

  const clearUserPhoto = () => {
    if (userPhotoUrl) URL.revokeObjectURL(userPhotoUrl);
    setUserPhotoUrl(null);
    setUserPhotoName('');
    setAdjustments(createDefaultAdjustments());
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="flex h-16 items-center justify-between border-b border-white/7 px-5 lg:px-7">
        <div className="flex items-center gap-3"><span className="brand-mark" aria-hidden="true" /><div><p className="text-sm font-semibold tracking-[0.18em]">色彩暗房</p><p className="text-[10px] text-muted-foreground">把色彩理论，变成看得见的调色练习</p></div></div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="hidden sm:inline">学习进度</span><div className="hidden w-36 sm:block"><Progress value={completionPercent} className="gap-0"><ProgressLabel className="sr-only">课程进度</ProgressLabel><ProgressValue className="sr-only" /></Progress></div><span className="font-mono text-foreground">{completedLessons.length} / {LESSONS.length}</span></div>
      </header>

      <div className="studio-grid">
        <aside className="lesson-rail">
          <p className="eyebrow mb-5">学习路径</p>
          <nav aria-label="课程章节" className="space-y-2">
            {LESSONS.map((item, index) => {
              const active = item.id === lesson.id;
              const complete = completedLessons.includes(item.id);
              return <button key={item.id} onClick={() => chooseLesson(item.id)} className={`lesson-item ${active ? 'lesson-item-active' : ''}`} type="button" aria-current={active ? 'step' : undefined}>
                <span className="font-mono text-[10px] text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                <span className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-medium">{item.shortTitle}</span><span className="block text-[10px] text-muted-foreground">{complete ? '已完成' : active ? '正在学习' : '未开始'}</span></span>
                {complete ? <CheckCircle2 className="size-4 text-emerald-300" /> : active ? <ChevronRight className="size-4 text-cyan-300" /> : <Circle className="size-3 text-white/15" />}
              </button>;
            })}
          </nav>
          <div className="mt-6 rounded-2xl border border-white/7 bg-white/[0.025] p-4 lg:mt-auto"><Sparkles className="mb-3 size-4 text-amber-300" /><p className="text-xs font-medium">观察先于参数</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground">每次只改变一个变量，并用自己的话描述变化。</p></div>
        </aside>

        {lesson.kind === 'mixer' ? (
          <ColorMixerLesson key={lesson.id} lesson={lesson} completedExercises={completedExercises} onExerciseComplete={(exerciseId) => handleExerciseComplete(lesson.id, exerciseId)} />
        ) : (
          <>
        <section className="workbench">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><p className="eyebrow">{lesson.chapter} · {lesson.shortTitle}</p><h1 className="mt-1 text-xl font-semibold tracking-tight lg:text-2xl">{lesson.title}</h1></div>
            <div className="flex gap-2">{userPhotoUrl && <Button variant="ghost" size="sm" onClick={clearUserPhoto}><X />使用课程样片</Button>}<Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="border-white/10 bg-white/[0.03]"><ImagePlus />导入照片</Button><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { handleFile(event.target.files?.[0]); event.currentTarget.value = ''; }} /></div>
          </div>
          {userPhotoUrl && <div className="mb-3 flex items-center gap-2 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.05] px-3 py-2 text-[11px] text-cyan-100"><Upload className="size-3.5" />自由练习 · {userPhotoName}<span className="ml-auto text-cyan-100/55">照片只在本机处理</span></div>}

          <div className="image-stage" style={{ aspectRatio }}>
            <canvas ref={originalCanvasRef} className="absolute inset-0 size-full" aria-label={userPhotoUrl ? `用户照片 ${userPhotoName}` : lesson.sampleAlt} />
            <canvas ref={adjustedCanvasRef} className="absolute inset-0 size-full" style={{ clipPath: showOriginal ? 'inset(0 100% 0 0)' : `inset(0 ${100 - comparePosition}% 0 0)` }} aria-hidden="true" />
            {!showOriginal && comparePosition < 100 && <div className="pointer-events-none absolute inset-y-0 w-px bg-white shadow-[0_0_0_1px_rgba(0,0,0,.25)]" style={{ left: `${comparePosition}%` }} />}
            {!imageReady && !imageError && <div className="absolute inset-0 grid place-items-center bg-black/50"><LoaderCircle className="size-6 animate-spin text-cyan-300" /></div>}
            {imageError && <div className="absolute inset-0 grid place-items-center bg-zinc-950/90 p-8 text-center"><div><p className="text-sm font-medium">无法显示照片</p><p className="mt-2 text-xs text-muted-foreground">{imageError}</p></div></div>}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-12">
              <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[10px] text-white/80 backdrop-blur">{userPhotoUrl ? '自由练习照片' : lesson.sampleLabel}</span>
              <div className="flex gap-2"><Button size="sm" variant="secondary" className="bg-white/90 text-zinc-900 hover:bg-white" onPointerDown={() => setShowOriginal(true)} onPointerUp={() => setShowOriginal(false)} onPointerLeave={() => setShowOriginal(false)} onPointerCancel={() => setShowOriginal(false)}><Eye />按住看原图</Button><Button size="icon-sm" variant="outline" aria-label="重置调节" onClick={() => setAdjustments(createDefaultAdjustments())} className="border-white/15 bg-black/30 text-white"><RotateCcw /></Button></div>
            </div>
          </div>

          <div className="mt-4 block rounded-xl border border-white/7 bg-white/[0.025] px-4 py-3"><span className="mb-2 flex justify-between text-[10px] text-muted-foreground"><span>原图</span><span className="flex items-center gap-1">拖动比较 {rendering && <LoaderCircle className="size-3 animate-spin" />}</span><span>调色后</span></span><Slider value={[comparePosition]} min={0} max={100} onValueChange={(value) => setComparePosition(Array.isArray(value) ? value[0] : value)} aria-label="原图与调色后分割对比" /></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">{[['观察', lesson.observe], ['动手', lesson.task], ['避坑', lesson.mistake]].map(([title, copy], index) => <div key={title} className="observation-card"><span className="font-mono text-[10px] text-cyan-300">0{index + 1}</span><p className="mt-2 text-xs font-medium">{title}</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground">{copy}</p></div>)}</div>
        </section>

        <aside className="control-panel">
          <div><p className="eyebrow">知识卡</p><h2 className="mt-2 text-base font-semibold">{lesson.conceptTitle}</h2><p className="mt-2 text-xs leading-6 text-muted-foreground">{lesson.concept}</p></div>
          <div className="spectrum-line" aria-hidden="true" />
          <AdjustmentControls lesson={lesson} adjustments={adjustments} onChange={setAdjustments} />
          <div className="task-card">
            <div className="flex items-center gap-2"><span className={`grid size-6 place-items-center rounded-full ${feedback.status === 'success' ? 'bg-emerald-300/12 text-emerald-300' : 'bg-amber-300/12 text-amber-300'}`}>{feedback.status === 'success' ? <CheckCircle2 className="size-3.5" /> : <Check className="size-3.5" />}</span><p className="text-xs font-semibold">{userPhotoUrl ? '自由练习' : '本章任务'}</p></div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">{userPhotoUrl ? '试着复现刚才在课程样片上观察到的变化。' : lesson.task}</p>
            <output aria-live="polite" className={`mt-3 block rounded-lg border px-3 py-2 text-[11px] ${feedback.status === 'success' ? 'border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-100' : 'border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-100'}`}>{feedback.message}</output>
          </div>
          {completedLessons.length === LESSONS.length && <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-xs"><p className="font-semibold text-amber-100">七章已完成</p><p className="mt-1 leading-5 text-muted-foreground">你已经建立了从观察、照片调节到光色与颜料混合的完整基础路径。</p></div>}
        </aside>
          </>
        )}
      </div>
    </main>
  );
}
