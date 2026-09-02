import type { LessonDefinition } from './types';

/** 为 public 目录资源补上 Vite 部署基路径，兼容本地开发与 GitHub Pages 子路径。 */
const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export const LESSONS: LessonDefinition[] = [
  {
    id: 'color-dimensions', chapter: '第一章', shortTitle: '色彩三属性', title: '看见颜色的三个维度',
    sample: publicAsset('samples/lesson-1.webp'), sampleAlt: '中性日光中的多色桌面静物', sampleLabel: '中性光 · 多色静物',
    conceptTitle: '饱和度不是“颜色多少”',
    concept: '色相回答“是什么颜色”，饱和度描述颜色偏离灰色的程度，明度则决定它有多亮。一次只改变一个维度，更容易建立视觉记忆。',
    observe: '先找出画面中最醒目的颜色，再观察灰布是否仍然保持中性。',
    mistake: '只追求鲜艳会压缩细微层次，让不同材质看起来像同一种表面。',
    task: '把饱和度调到 +20 ～ +35，同时让明度保持在 -5 ～ +5。',
    success: '颜色更鲜明，明暗关系没有被破坏。', controls: 'global',
    constraints: [
      { kind: 'parameter', path: 'saturation', min: 20, max: 35, lowHint: '再提高一点饱和度，观察颜色与灰布的距离。', highHint: '饱和度过高，收回来一些以保留材质层次。' },
      { kind: 'parameter', path: 'lightness', min: -5, max: 5, lowHint: '画面整体变暗了，把明度拉回中性附近。', highHint: '画面整体变亮了，把明度拉回中性附近。' },
    ],
  },
  {
    id: 'white-balance', chapter: '第二章', shortTitle: '白平衡', title: '让中性色重新中性',
    sample: publicAsset('samples/lesson-2.webp'), sampleAlt: '暖钨丝灯下的咖啡桌与白色陶瓷杯', sampleLabel: '钨丝灯 · 暖色偏移',
    conceptTitle: '白平衡先找“应该中性”的物体',
    concept: '色温沿蓝—黄方向移动，色调沿绿—洋红方向移动。判断白平衡时，先寻找白杯、灰卡等本应接近中性的参照。',
    observe: '比较白杯高光和灰卡，它们是否被同一种暖黄色覆盖。',
    mistake: '为了“变冷”而过度降低色温，会把真实暖光氛围一起消除。',
    task: '降低色温至 -35 ～ -18，并让色调保持在 -8 ～ +8。',
    success: '中性物体恢复自然，现场的暖光氛围仍被保留。', controls: 'whiteBalance',
    constraints: [
      { kind: 'parameter', path: 'temperature', min: -35, max: -18, lowHint: '画面已经偏蓝，稍微恢复一些暖度。', highHint: '白杯仍然偏黄，继续降低一点色温。' },
      { kind: 'parameter', path: 'tint', min: -8, max: 8, lowHint: '绿色补偿过多，把色调拉回中间。', highHint: '洋红补偿过多，把色调拉回中间。' },
    ],
  },
  {
    id: 'color-harmony', chapter: '第三章', shortTitle: '色彩关系', title: '用色相距离理解画面张力',
    sample: publicAsset('samples/lesson-3.webp'), sampleAlt: '蓝绿色木门与橙色墙面的街景', sampleLabel: '街景 · 蓝橙互补',
    conceptTitle: '互补色来自色轮两端',
    concept: '色相相差约 180° 时形成互补关系，对比强、注意力集中；相邻色更和谐，适合营造统一氛围。',
    observe: '观察橙墙占据的大面积与蓝绿门的较小面积，面积并不相等但视觉仍然平衡。',
    mistake: '互补色不等于两种颜色都拉满饱和度；主次和面积比同样重要。',
    task: '转动两个色相点，让主色与强调色形成 170° ～ 190° 的色相距离。',
    success: '两个色相形成了清晰的互补关系。', controls: 'harmony',
    constraints: [{ kind: 'harmony', minDifference: 170, maxDifference: 190, hint: '继续拉开两个色相点，目标是位于色轮两端。' }],
  },
  {
    id: 'selective-hsl', chapter: '第四章', shortTitle: '分颜色 HSL', title: '只调整需要改变的颜色',
    sample: publicAsset('samples/lesson-4.webp'), sampleAlt: '暖色衣服的人像与绿色植物背景', sampleLabel: '人像 · 暖肤色与绿色背景',
    conceptTitle: '局部颜色调整需要软边界',
    concept: '真实照片中的颜色不会整齐地落在单一色相上。六色带采用柔和重叠，调整绿色时也会轻微影响相邻的黄色和青色。',
    observe: '先看背景叶片，再检查肤色与橙色衣服是否被连带改变。',
    mistake: '大幅移动色相容易制造不自然边缘；优先用饱和度和明度控制注意力。',
    task: '把绿色饱和度降到 -45 ～ -20，同时让橙色饱和度保持在 -10 ～ +10。',
    success: '背景绿色更克制，暖色主体仍然自然。', controls: 'bands',
    constraints: [
      { kind: 'parameter', path: 'bands.green.saturation', min: -45, max: -20, lowHint: '绿色已经过灰，适当恢复一些饱和度。', highHint: '背景仍然抢眼，继续降低绿色饱和度。' },
      { kind: 'parameter', path: 'bands.orange.saturation', min: -10, max: 10, lowHint: '橙色主体被削弱了，把橙色饱和度拉回中间。', highHint: '橙色主体过强，把橙色饱和度拉回中间。' },
    ],
  },
  {
    id: 'curves-grading', chapter: '第五章', shortTitle: '曲线与色调', title: '用明暗结构承载冷暖情绪',
    sample: publicAsset('samples/lesson-5.webp'), sampleAlt: '蓝调时刻中带暖色灯光的河岸城市', sampleLabel: '蓝调时刻 · 冷暖层次',
    conceptTitle: '先做层次，再添加颜色倾向',
    concept: 'S 曲线压低阴影、抬高高光以增加对比；随后再给阴影少量冷色、高光少量暖色，情绪才会依附于稳定的明暗结构。',
    observe: '留意暗部是否仍有细节，以及暖色灯光是否保持亮度层次。',
    mistake: '分离色调强度过大，会让灰色和肤色染成明显的双色滤镜。',
    task: '建立温和 S 曲线，并把冷阴影、暖高光强度都控制在 8 ～ 22。',
    success: '对比更清晰，冷暖色彩仍然克制。', controls: 'curve',
    constraints: [
      { kind: 'parameter', path: 'curve.1.y', min: 48, max: 60, lowHint: '阴影压得过重，抬高左侧控制点。', highHint: '再压低一点阴影，形成曲线下半段。' },
      { kind: 'parameter', path: 'curve.2.y', min: 204, max: 220, lowHint: '再抬高一点高光，形成曲线上半段。', highHint: '高光提升过多，降低右侧控制点。' },
      { kind: 'parameter', path: 'shadows.amount', min: 8, max: 22, lowHint: '增加少量冷阴影强度。', highHint: '冷阴影太明显，降低强度。' },
      { kind: 'parameter', path: 'highlights.amount', min: 8, max: 22, lowHint: '增加少量暖高光强度。', highHint: '暖高光太明显，降低强度。' },
    ],
  },
];
