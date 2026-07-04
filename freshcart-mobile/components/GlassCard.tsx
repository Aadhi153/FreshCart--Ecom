import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import type { BlurTint } from 'expo-blur';
import { theme } from '@freshcart/ui';

interface GlassCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: BlurTint;
  borderRadius?: number;
}

export function GlassCard({ children, style, intensity = 45, tint = 'light', borderRadius = theme.radii.md }: GlassCardProps) {
  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      style={[
        {
          borderRadius,
          borderWidth: 1,
          borderColor: theme.light.borderColor,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
}
