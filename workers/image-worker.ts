/// <reference lib="webworker" />

import { applyAdjustments } from '../lib/color-engine';
import type { WorkerRequest, WorkerResponse } from '../lib/types';

let source: Uint8ClampedArray | null = null;
let width = 0;
let height = 0;

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  if (message.type === 'init') {
    source = new Uint8ClampedArray(message.buffer);
    width = message.width;
    height = message.height;
    return;
  }

  try {
    if (!source) throw new Error('教学样片尚未完成初始化');
    const pixels = applyAdjustments(source, message.adjustments);
    const response: WorkerResponse = {
      type: 'result', requestId: message.requestId, width, height, buffer: pixels.buffer as ArrayBuffer,
    };
    self.postMessage(response, { transfer: [pixels.buffer] });
  } catch (error) {
    const response: WorkerResponse = {
      type: 'error', requestId: message.requestId,
      message: error instanceof Error ? error.message : '图像处理失败',
    };
    self.postMessage(response);
  }
};

export {};
