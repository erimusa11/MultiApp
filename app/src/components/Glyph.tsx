import React from 'react';
import { View, ViewStyle } from 'react-native';

/**
 * Tiny hand-drawn icon set built from plain Views, so the app ships
 * without an icon-font dependency.
 */
type Props = { size?: number; color?: string; style?: ViewStyle };

export function PlusGlyph({ size = 20, color = '#fff', style }: Props) {
  const t = Math.max(2, size * 0.14);
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={{ position: 'absolute', width: size, height: t, borderRadius: t, backgroundColor: color }} />
      <View style={{ position: 'absolute', width: t, height: size, borderRadius: t, backgroundColor: color }} />
    </View>
  );
}

export function CloseGlyph({ size = 18, color = '#fff', style }: Props) {
  return <PlusGlyph size={size} color={color} style={{ transform: [{ rotate: '45deg' }], ...style }} />;
}

export function SearchGlyph({ size = 18, color = '#7A90A8' }: Props) {
  const ring = size * 0.68;
  const t = Math.max(2, size * 0.12);
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: ring, height: ring, borderRadius: ring, borderWidth: t, borderColor: color }} />
      <View
        style={{
          position: 'absolute',
          width: size * 0.38,
          height: t,
          borderRadius: t,
          backgroundColor: color,
          right: 0,
          bottom: size * 0.14,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}

export function DotsGlyph({ size = 20, color = '#0E2A47' }: Props) {
  const d = size * 0.2;
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      {[0, 1, 2].map(i => (
        <View key={i} style={{ width: d, height: d, borderRadius: d, backgroundColor: color }} />
      ))}
    </View>
  );
}

export function CheckGlyph({ size = 18, color = '#fff' }: Props) {
  const t = Math.max(2, size * 0.16);
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          left: size * 0.12,
          top: size * 0.3,
          width: size * 0.32,
          height: size * 0.56,
          borderRightWidth: t,
          borderBottomWidth: t,
          borderColor: color,
          transform: [{ rotate: '45deg' }, { translateX: size * 0.08 }],
        }}
      />
    </View>
  );
}

/** Two overlapping rounded squares — the "clone" mark used across the app. */
export function TwinGlyph({ size = 18, color = '#fff', fill }: Props & { fill?: string }) {
  const s = size * 0.62;
  const t = Math.max(1.5, size * 0.11);
  const r = s * 0.3;
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', left: 0, top: 0, width: s, height: s, borderRadius: r, borderWidth: t, borderColor: color }} />
      <View
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: s,
          height: s,
          borderRadius: r,
          borderWidth: t,
          borderColor: color,
          backgroundColor: fill ?? 'transparent',
        }}
      />
    </View>
  );
}

export function MoonGlyph({ size = 16, color = '#fff', bg = '#7A90A8' }: Props & { bg?: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size, backgroundColor: color, overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          width: size * 0.82,
          height: size * 0.82,
          borderRadius: size,
          backgroundColor: bg,
          top: -size * 0.12,
          left: size * 0.34,
        }}
      />
    </View>
  );
}

export function ChevronGlyph({ size = 12, color = '#7A90A8' }: Props) {
  const t = Math.max(2, size * 0.2);
  return (
    <View
      style={{
        width: size * 0.7,
        height: size * 0.7,
        borderRightWidth: t,
        borderTopWidth: t,
        borderColor: color,
        transform: [{ rotate: '45deg' }],
        marginRight: size * 0.2,
      }}
    />
  );
}
