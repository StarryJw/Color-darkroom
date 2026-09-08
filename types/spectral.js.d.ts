declare module 'spectral.js' {
  export class Color {
    constructor(value: string | [number, number, number]);
    toString(): string;
  }

  export function mix(...colors: Array<[Color, number]>): Color;
}
