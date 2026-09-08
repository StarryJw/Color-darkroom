// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/workers/image-worker.ts?worker', () => ({
  default: class FakeImageWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: (() => void) | null = null;
    postMessage() {}
    terminate() {}
  },
}));

import { ColorLab } from '../components/color-lab';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob(['image']) })));
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 2, height: 2, close: vi.fn() })));
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:local-photo'),
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(16), width: 2, height: 2 })),
    putImageData: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('照片与混色章节切换', () => {
  it('进入混色章节后仍在内存中保留已导入照片', async () => {
    const user = userEvent.setup();
    const { container } = render(<ColorLab />);
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!fileInput) throw new Error('未找到照片导入控件');
    const file = new File(['pixels'], '本地练习.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText(/自由练习 · 本地练习.png/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /06.*光色混合/ }));
    expect(screen.queryByText(/自由练习 · 本地练习.png/)).toBeNull();
    await user.click(screen.getByRole('button', { name: /01.*色彩三属性/ }));
    await waitFor(() => expect(screen.getByText(/自由练习 · 本地练习.png/)).toBeTruthy());
  });
});
