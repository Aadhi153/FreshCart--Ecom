import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface AnimatedPressableProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function AnimatedPressable({ children, onPress, style, disabled }: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[style, animatedStyle]}
      onTouchStart={() => { if (!disabled) scale.value = withTiming(0.96, { duration: 100 }); }}
      onTouchEnd={() => { scale.value = withTiming(1, { duration: 150 }); onPress?.(); }}
      onTouchCancel={() => { scale.value = withTiming(1, { duration: 150 }); }}
    >
      {children}
    </Animated.View>
  );
}
