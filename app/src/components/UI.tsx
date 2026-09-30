import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
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
import { colors, radius, shadow } from '../theme';
import { MoonGlyph, TwinGlyph } from './Glyph';

/** Pressable with a springy scale-down, used for every tappable surface. */
export function Tap({
  onPress,
  onLongPress,
  style,
  children,
  disabled,
  scaleTo = 0.95,
}: {
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
  scaleTo?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 8 }).start();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={320}
      disabled={disabled}
      onPressIn={() => to(scaleTo)}
      onPressOut={() => to(1)}>
      <Animated.View style={[style, { transform: [{ scale }] }, disabled && { opacity: 0.5 }]}>
        {children}
      </Animated.View>
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
  kind?: 'primary' | 'soft' | 'danger' | 'ghost';
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = {
    primary: { bg: colors.brandDeep, fg: colors.white },
    soft: { bg: colors.skySoft, fg: colors.brand },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    ghost: { bg: 'transparent', fg: colors.inkSoft },
  }[kind];
  return (
    <Tap
      onPress={onPress}
      disabled={loading}
      style={[
        styles.button,
        { backgroundColor: palette.bg },
        kind === 'primary' && shadow,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon}
          <Text style={[styles.buttonText, { color: palette.fg }]}>{title}</Text>
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
  const b = Math.round(size * 0.4);
  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, opacity: sleeping ? 0.4 : 1 }} />
      ) : (
        <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: colors.line }} />
      )}
      {badgeColor ? (
        <View
          style={[
            styles.badge,
            {
              width: b,
              height: b,
              borderRadius: b,
              right: -b * 0.2,
              bottom: -b * 0.2,
              backgroundColor: sleeping ? colors.muted : badgeColor,
            },
          ]}>
          {sleeping ? (
            <MoonGlyph size={b * 0.5} bg={colors.muted} />
          ) : (
            <TwinGlyph size={b * 0.52} color={colors.white} fill={badgeColor} />
          )}
        </View>
      ) : null}
    </View>
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
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(progress, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 180 }).start();
    } else if (mounted) {
      Animated.timing(progress, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
  }, [visible, mounted, progress]);

  if (!mounted) {
    return null;
  }
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
  return (
    <Modal transparent visible statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          {
            paddingBottom: insets.bottom + 16,
            transform: [{ translateY }],
            maxHeight: height - insets.top - 24,
          },
          fullHeight && { height: height - insets.top - 24 },
        ]}>
        <View style={styles.grabber} />
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
  const [toast, setToast] = useState<{ msg: string; kind: ToastKind } | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (msg: string, kind: ToastKind = 'info') => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      setToast({ msg, kind });
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, bounciness: 10 }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
      }, 2600);
    },
    [anim],
  );

  const bg = toast?.kind === 'error' ? colors.danger : toast?.kind === 'success' ? colors.ink : colors.brandDeep;
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            shadow,
            {
              backgroundColor: bg,
              top: insets.top + 12,
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
            },
          ]}>
          <Text style={styles.toastText}>{toast.msg}</Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

/** Calls handler on Android back press while `active`. */
export function useBack(active: boolean, handler: () => void) {
  useEffect(() => {
    if (!active) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handler();
      return true;
    });
    return () => sub.remove();
  }, [active, handler]);
}

export const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: radius.md,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  badge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: colors.white,
  },
  backdrop: { backgroundColor: 'rgba(8, 30, 52, 0.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 5,
    backgroundColor: colors.line,
    marginBottom: 8,
  },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  toastText: { color: colors.white, fontWeight: '600', fontSize: 14.5, textAlign: 'center' },
});
