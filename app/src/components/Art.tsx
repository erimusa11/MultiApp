import React, { useId } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/** Fills its parent with a diagonal linear gradient (parent should clip with overflow: hidden). */
export function Gradient({
  from,
  to,
  style,
  angle = 'diagonal',
}: {
  from: string;
  to: string;
  style?: StyleProp<ViewStyle>;
  angle?: 'diagonal' | 'horizontal' | 'vertical';
}) {
  const id = 'g' + useId().replace(/[^A-Za-z0-9_-]/g, '');
  const end = angle === 'horizontal' ? { x2: '1', y2: '0' } : angle === 'vertical' ? { x2: '0', y2: '1' } : { x2: '1', y2: '1' };
  return (
    <Svg style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" {...end}>
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * Three flowing swooshes echoing the Multi-App logo. Stretches to fill its box.
 */
export function Waves({
  color = '#FFFFFF',
  opacity = 0.18,
  style,
}: {
  color?: string;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Svg
      style={[StyleSheet.absoluteFill, style]}
      viewBox="0 0 400 220"
      preserveAspectRatio="none"
      pointerEvents="none">
      <Path
        d="M0 176C92 172 140 132 190 86 238 42 300 16 400 10v22C318 40 262 70 222 110 176 156 110 196 0 204z"
        fill={color}
        opacity={opacity * 1.3}
      />
      <Path
        d="M120 214c70-10 118-40 158-72 38-30 76-44 122-44v18c-40 2-72 16-106 44-38 32-92 58-174 62z"
        fill={color}
        opacity={opacity}
      />
      <Path
        d="M228 220c44-12 76-32 104-52 22-16 44-24 68-24v14c-22 2-40 10-60 26-26 20-58 36-112 36z"
        fill={color}
        opacity={opacity * 0.8}
      />
    </Svg>
  );
}

