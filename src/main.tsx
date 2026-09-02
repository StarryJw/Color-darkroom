import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ColorLab } from '@/components/color-lab';
import '@/app/globals.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('无法找到应用挂载节点 #root');
}

createRoot(rootElement).render(
  <StrictMode>
    <ColorLab />
  </StrictMode>,
);
