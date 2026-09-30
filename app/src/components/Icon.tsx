import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** Stroke icon set (24×24 grid, rounded caps) drawn with react-native-svg. */
type Shape =
  | { d: string }
  | { c: [number, number, number] }
  | { r: [number, number, number, number, number] };

const ICONS = {
  plus: [{ d: 'M12 5v14M5 12h14' }],
  close: [{ d: 'M18 6 6 18M6 6l12 12' }],
  search: [{ c: [11, 11, 7.5] }, { d: 'm20.5 20.5-4.2-4.2' }],
  sliders: [{ d: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1.5 14h5M9.5 8h5M17.5 16h5' }],
  moon: [{ d: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z' }],
  sun: [
    { c: [12, 12, 4.5] },
    { d: 'M12 1.5v2M12 20.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1.5 12h2M20.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4' },
  ],
  phone: [{ r: [5, 2, 14, 20, 3] }, { d: 'M11 18h2' }],
  lock: [{ r: [4, 10.5, 16, 11, 3] }, { d: 'M8 10.5V7a4 4 0 0 1 8 0v3.5M12 15v2.5' }],
  shield: [{ d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }],
  shieldCheck: [{ d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }, { d: 'm8.8 12 2.2 2.2 4.4-4.4' }],
  home: [{ d: 'M3 10.2 12 3l9 7.2V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }, { d: 'M9.5 22v-7h5v7' }],
  trash: [
    { d: 'M3 6h18M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6' },
    { d: 'M18.5 6 17.7 19.2a2 2 0 0 1-2 1.8H8.3a2 2 0 0 1-2-1.8L5.5 6M10 11v5.5M14 11v5.5' },
  ],
  edit: [{ d: 'M12 20h9' }, { d: 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z' }],
  open: [{ d: 'M7 17 17 7M8 7h9v9' }],
  check: [{ d: 'M20 6 9 17l-5-5' }],
  sparkle: [{ d: 'M12 2.5 14 9l6.5 2L14 13l-2 6.5L10 13l-6.5-2L10 9z' }],
  eyeOff: [
    { d: 'M9.9 4.2A9.6 9.6 0 0 1 12 4c7 0 10.5 8 10.5 8a17.6 17.6 0 0 1-2.2 3.2' },
    { d: 'M6.6 6.6C3.3 8.6 1.5 12 1.5 12S5 20 12 20a9.7 9.7 0 0 0 5.4-1.6M14.1 14.1a3 3 0 1 1-4.2-4.2M2 2l20 20' },
  ],
  wifiOff: [
    { d: 'M2 2l20 20M8.5 16.4a5.5 5.5 0 0 1 7 0M5 12.6a10.6 10.6 0 0 1 4.8-2.4M19 12.6a10.6 10.6 0 0 0-2.1-1.4' },
    { d: 'M1.6 9a16 16 0 0 1 4.3-2.8M10.7 5a16 16 0 0 1 11.7 4M12 20h.01' },
  ],
  chevron: [{ d: 'm9 18 6-6-6-6' }],
  twin: [{ r: [8.5, 8.5, 12.5, 12.5, 3] }, { d: 'M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5' }],
  play: [{ d: 'M6 4.5v15l13-7.5z' }],
  pause: [{ d: 'M8 4.5v15M16 4.5v15' }],
  info: [{ c: [12, 12, 9.5] }, { d: 'M12 16.5v-5M12 7.8h.01' }],
  palette: [
    { d: 'M12 2.5a9.5 9.5 0 0 0 0 19c1.3 0 1.9-.9 1.9-1.8 0-1.3-1.1-1.6-1.1-2.7 0-1 .8-1.7 1.8-1.7h2.2a4.7 4.7 0 0 0 4.7-4.7C21.5 6.1 17.3 2.5 12 2.5z' },
    { c: [7.5, 11, 1] },
    { c: [10.5, 7, 1] },
    { c: [15.5, 7.5, 1] },
  ],
  grid: [{ r: [3, 3, 7.5, 7.5, 2] }, { r: [13.5, 3, 7.5, 7.5, 2] }, { r: [3, 13.5, 7.5, 7.5, 2] }, { r: [13.5, 13.5, 7.5, 7.5, 2] }],
} satisfies Record<string, Shape[]>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 22,
  color = '#0B2540',
  stroke = 2,
  fill = 'none',
}: {
  name: IconName;
  size?: number;
  color?: string;
  stroke?: number;
  fill?: string;
}) {
  const shapes: Shape[] = ICONS[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {shapes.map((s, i) => {
        const common = {
          stroke: color,
          strokeWidth: stroke,
          strokeLinecap: 'round' as const,
          strokeLinejoin: 'round' as const,
          fill,
        };
        if ('d' in s) {
          return <Path key={i} {...common} d={s.d} />;
        }
        if ('c' in s) {
          return <Circle key={i} {...common} cx={s.c[0]} cy={s.c[1]} r={s.c[2]} />;
        }
        return <Rect key={i} {...common} x={s.r[0]} y={s.r[1]} width={s.r[2]} height={s.r[3]} rx={s.r[4]} />;
      })}
    </Svg>
  );
}
