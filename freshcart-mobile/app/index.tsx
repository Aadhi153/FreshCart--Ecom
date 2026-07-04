import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, AccessibilityInfo } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@freshcart/ui';
import { AnimatedPressable } from '../components/AnimatedPressable';

function useDrift(duration: number, distance: number, delay = 0) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled || reduced) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      loop.start();
    });

    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [value, duration, delay]);

  const translateY = value.interpolate({ inputRange: [0, 1], outputRange: [0, distance] });
  const scale = value.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  return { transform: [{ translateY }, { scale }] };
}

export default function SplashScreen() {
  const router = useRouter();
  const orbOne = useDrift(7000, -26);
  const orbTwo = useDrift(9000, 22, 400);
  const orbThree = useDrift(8000, -18, 900);

  return (
    <View style={styles.container}>
      <View style={styles.backdrop} pointerEvents="none">
        <Animated.View style={[styles.orb, styles.orbOne, orbOne]} />
        <Animated.View style={[styles.orb, styles.orbTwo, orbTwo]} />
        <Animated.View style={[styles.orb, styles.orbThree, orbThree]} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>FreshCart</Text>
        <Text style={styles.subtitle}>Farm Fresh. Delivered Fast.</Text>
      </View>
      <AnimatedPressable
        style={styles.button}
        onPress={() => router.push('/auth')}
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    justifyContent: 'space-between',
    padding: 32,
    overflow: 'hidden',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  orbOne: {
    width: 260,
    height: 260,
    left: -80,
    top: -60,
    backgroundColor: theme.colors.accent,
    opacity: 0.28,
  },
  orbTwo: {
    width: 220,
    height: 220,
    right: -70,
    top: '32%',
    backgroundColor: '#ffffff',
    opacity: 0.12,
  },
  orbThree: {
    width: 300,
    height: 300,
    left: '18%',
    bottom: -140,
    backgroundColor: theme.colors.accent,
    opacity: 0.2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#E8EDE6',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: theme.radii.full,
    alignItems: 'center',
    marginBottom: 32,
  },
  buttonText: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '600',
  },
});
