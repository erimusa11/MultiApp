import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Space } from '../native';
import { Palette, radius, shadow, useStyles, useTheme } from '../theme';
import { Gradient } from './Art';
import { Icon, IconName } from './Icon';

export const haptic = (kind: 'tap' | 'success' | 'warning' = 'tap') => {
  try {
    Space.haptic(kind);
  } catch {}
};

/** Pressable with a springy scale-down, used for every tappable surface. */
export function Tap({
  onPress,
  onLongPress,
  style,
  children,
  disabled,
  scaleTo = 0.96,
  feedback = true,
  accessibilityLabel,
}: {
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
  scaleTo?: number;
  feedback?: boolean;
  accessibilityLabel?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 8 }).start();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={
        onPress &&
        (() => {
          if (feedback) {
            haptic('tap');
          }
          onPress();
        })
      }
      onLongPress={
        onLongPress &&
        (() => {
          haptic('success');
          onLongPress();
        })
      }
      delayLongPress={320}
      disabled={disabled}
      onPressIn={() => to(scaleTo)}
      onPressOut={() => to(1)}>
      <Animated.View style={[style, { transform: [{ scale }] }, disabled && ui.disabled]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  loading,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'soft' | 'danger' | 'ghost' | 'white';
  loading?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTheme();
  const palette = {
    primary: { bg: 'transparent', fg: t.white },
    soft: { bg: t.skySoft, fg: t.brand },
    danger: { bg: t.dangerSoft, fg: t.danger },
    ghost: { bg: 'transparent', fg: t.inkSoft },
    white: { bg: t.white, fg: '#0B5DA6' },
  }[kind];
  return (
    <Tap
      onPress={onPress}
      disabled={loading}
      style={[ui.button, { backgroundColor: palette.bg }, kind === 'primary' && shadow(t, 2), style]}>
      {kind === 'primary' ? <Gradient from={t.heroA} to={t.heroB} angle="horizontal" /> : null}
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={19} color={palette.fg} stroke={2.4} /> : null}
          <Text style={[ui.buttonText, { color: palette.fg }]}>{title}</Text>
        </>
      )}
    </Tap>
  );
}

/** App icon, optionally dressed as a clone (colored twin badge / sleeping). */
export function AppIcon({
  uri,
  size = 56,
  badgeColor,
  sleeping,
}: {
  uri?: string;
  size?: number;
  badgeColor?: string;
  sleeping?: boolean;
}) {
  const { t } = useTheme();
  const b = Math.round(size * 0.42);
  const iconOpacity = sleeping ? 0.35 : 1;
  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, opacity: iconOpacity }} />
      ) : (
        <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: t.line }} />
      )}
      {badgeColor ? (
        <View
          style={[
            ui.badge,
            {
              width: b,
              height: b,
              borderRadius: b,
              right: -b * 0.22,
              bottom: -b * 0.22,
              borderColor: t.card,
              backgroundColor: sleeping ? t.muted : badgeColor,
            },
          ]}>
          <Icon name={sleeping ? 'moon' : 'twin'} size={b * 0.56} color="#FFFFFF" stroke={2.6} />
        </View>
      ) : null}
    </View>
  );
}

/** Rounded icon tile used in list rows. */
export function IconTile({ name, color, bg, size = 42 }: { name: IconName; color: string; bg: string; size?: number }) {
  return (
    <View style={[ui.iconTile, { width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg }]}>
      <Icon name={name} size={size * 0.48} color={color} stroke={2.2} />
    </View>
  );
}

/** Animated on/off switch. */
export function Switch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const { t } = useTheme();
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: value ? 1 : 0, useNativeDriver: false, bounciness: 8 }).start();
  }, [value, anim]);
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={() => onChange(!value)} hitSlop={8}>
      <Animated.View
        style={[
          ui.switch,
          { backgroundColor: anim.interpolate({ inputRange: [0, 1], outputRange: [t.line, t.sky] }) },
        ]}>
        <Animated.View
          style={[ui.knob, { transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [3, 23] }) }] }]}
        />
      </Animated.View>
    </Pressable>
  );
}

/** Bottom sheet with a spring-in panel and a fading backdrop. */
export function Sheet({
  visible,
  onClose,
  children,
  fullHeight,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  fullHeight?: boolean;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const s = useStyles(sheetStyles);
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(progress, { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 190 }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => finished && setMounted(false));
    }
  }, [visible, progress]);

  if (!mounted) {
    return null;
  }
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
  const maxHeight = height - insets.top - 20;
  return (
    <Modal transparent visible statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, s.backdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        style={[
          s.sheet,
          { paddingBottom: insets.bottom + 16, transform: [{ translateY }], maxHeight },
          fullHeight && { height: maxHeight },
        ]}>
        <View style={s.grabber} />
        {children}
      </Animated.View>
    </Modal>
  );
}

// ---------- Toasts ----------

type ToastKind = 'info' | 'success' | 'error';
const ToastContext = createContext<(msg: string, kind?: ToastKind) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { t } = useTheme();
  const [toast, setToast] = useState<{ msg: string; kind: ToastKind } | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (msg: string, kind: ToastKind = 'info') => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      if (kind === 'error') {
        haptic('warning');
      }
      setToast({ msg, kind });
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, bounciness: 10 }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
      }, 2800);
    },
    [anim],
  );

  const accent = toast?.kind === 'error' ? t.danger : toast?.kind === 'success' ? t.success : t.sky;
  const icon: IconName = toast?.kind === 'error' ? 'info' : toast?.kind === 'success' ? 'check' : 'sparkle';
  const toastBg = t.dark ? t.cardAlt : '#0B2540';
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            ui.toast,
            shadow(t, 2),
            {
              backgroundColor: toastBg,
              top: insets.top + 10,
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
            },
          ]}>
          <View style={[ui.toastIcon, { backgroundColor: accent }]}>
            <Icon name={icon} size={14} color="#FFFFFF" stroke={2.8} />
          </View>
          <Text style={ui.toastText}>{toast.msg}</Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const ui = StyleSheet.create({
  disabled: { opacity: 0.45 },
  button: {
    height: 56,
    borderRadius: radius.md,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  buttonText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  badge: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderWidth: 2.5 },
  iconTile: { alignItems: 'center', justifyContent: 'center' },
  switch: { width: 50, height: 30, borderRadius: 15, justifyContent: 'center' },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toastIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  toastText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14.5, flex: 1 },
});

const sheetStyles = (t: Palette) =>
  StyleSheet.create({
    backdrop: { backgroundColor: t.overlay },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: t.bg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingTop: 10,
    },
    grabber: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 5,
      backgroundColor: t.line,
      marginBottom: 10,
    },
  });
