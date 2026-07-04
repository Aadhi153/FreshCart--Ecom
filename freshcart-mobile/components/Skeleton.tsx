import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { theme } from '@freshcart/ui';

export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.base, animatedStyle, style]} />;
}

export function ProductCardSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[skeletonStyles.card, style]}>
      <Skeleton style={skeletonStyles.image} />
      <Skeleton style={{ width: '40%', height: 10, marginBottom: 6 }} />
      <Skeleton style={{ width: '80%', height: 13, marginBottom: 8 }} />
      <Skeleton style={{ width: '50%', height: 15 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.light.layer2,
    borderRadius: theme.radii.sm,
  },
});

const skeletonStyles = StyleSheet.create({
  card: {
    flex: 1, margin: 8, padding: 14,
    backgroundColor: theme.light.layer1,
    borderRadius: 16,
  },
  image: {
    height: 120, borderRadius: 10, marginBottom: 10,
  },
});
