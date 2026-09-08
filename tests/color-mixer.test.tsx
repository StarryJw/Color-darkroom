// @vitest-environment jsdom

import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ColorMixerLesson } from '../components/color-mixer-lesson';
import { LESSONS } from '../lib/lessons';
import type { MixerLessonDefinition } from '../lib/types';

const lightLesson = LESSONS.find(
  (lesson): lesson is MixerLessonDefinition => lesson.id === 'additive-light',
)!;

afterEach(cleanup);

/** 模拟主工作台逐题保存进度，验证整章完成后的真实交互。 */
function ProgressHarness() {
  const [completed, setCompleted] = useState<string[]>([]);
  return <ColorMixerLesson lesson={lightLesson} completedExercises={completed}
    onExerciseComplete={(id) => setCompleted((current) => [...current, id])} />;
}

describe('混色课程交互', () => {
  it('末题完成后进入自由模式，返回预测保留揭晓结果', async () => {
    const user = userEvent.setup();
    render(<ProgressHarness />);
    for (const answer of ['黄光', '青光']) {
      await user.click(screen.getByRole('button', { name: answer }));
      await user.click(screen.getByRole('button', { name: '下一题' }));
    }
    await user.click(screen.getByRole('button', { name: '白光' }));
    expect(screen.queryByRole('button', { name: '下一题' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '进入自由调色盘' }));
    expect(screen.getByRole('tab', { name: '自由调色盘' }).getAttribute('aria-selected')).toBe('true');
    await user.click(screen.getByRole('tab', { name: '预测练习' }));
    expect(screen.getByTestId('guided-result').textContent).toContain('白光');
  });

  it('综合色调题揭晓后展示三组独立计算的结果', async () => {
    const user = userEvent.setup();
    const lesson = LESSONS.find((item): item is MixerLessonDefinition => item.id === 'pigment-tone')!;
    render(<ColorMixerLesson lesson={lesson}
      completedExercises={['pigment-blue-yellow', 'pigment-complements']}
      onExerciseComplete={() => undefined} />);
    expect(screen.queryByTestId('comparison-results')).toBeNull();
    expect(screen.getByTestId('guided-result').textContent).toBe('？');
    await user.click(screen.getByRole('button', { name: '白 → Tint · 灰 → Tone · 黑 → Shade' }));
    const results = screen.getByTestId('comparison-results');
    for (const hex of ['#83B0E0', '#4E6E8A', '#2B3F4F']) expect(results.textContent).toContain(hex);
    for (const label of ['Tint', 'Tone', 'Shade']) expect(results.textContent).toContain(label);
  });

  it('自定义颜色后清除过时的预设名称', async () => {
    const user = userEvent.setup();
    render(<ProgressHarness />);
    await user.click(screen.getByRole('tab', { name: '自由调色盘' }));
    fireEvent.change(screen.getByLabelText('选择红光'), { target: { value: '#0000ff' } });
    expect(screen.queryByLabelText('选择红光')).toBeNull();
    expect((screen.getByLabelText('选择自定义颜色 A') as HTMLInputElement).value).toBe('#0000ff');
  });
  it('预测前隐藏结果，答错可重试，答对后保存', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(
      <ColorMixerLesson
        lesson={lightLesson}
        completedExercises={[]}
        onExerciseComplete={onComplete}
      />,
    );

    expect(screen.getByTestId('guided-result').textContent).toBe('？');
    await user.click(screen.getByRole('button', { name: '橙光' }));
    expect(screen.getByTestId('guided-result').textContent).toContain('黄光');
    expect(screen.getByText('这次没有猜中')).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '再试一次' }));
    const correct = screen.getByRole('button', { name: '黄光' });
    correct.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('预测正确')).toBeTruthy();
    expect(onComplete).toHaveBeenCalledWith('light-red-green');
  });

  it('自由模式可用键盘添加并删除第三种颜色', async () => {
    const user = userEvent.setup();
    render(
      <ColorMixerLesson
        lesson={lightLesson}
        completedExercises={[]}
        onExerciseComplete={() => undefined}
      />,
    );
    await user.click(screen.getByRole('tab', { name: '自由调色盘' }));
    expect(screen.getAllByTestId('free-color-slot')).toHaveLength(2);

    const add = screen.getByTestId('add-third-color');
    add.focus();
    await user.keyboard('{Enter}');
    expect(screen.getAllByTestId('free-color-slot')).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: '删除第三种颜色' }));
    expect(screen.getAllByTestId('free-color-slot')).toHaveLength(2);
  });
});
