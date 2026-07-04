import { Stack } from 'expo-router';
import { theme } from '@freshcart/ui';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(shop)" options={{ headerShown: false }} />
      <Stack.Screen
        name="auth"
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="otp"
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="product/[id]"
        options={{
          presentation: 'card',
          animation: 'slide_from_bottom',
          headerShown: true,
          headerTitle: 'Product Details',
          headerStyle: { backgroundColor: theme.light.layer1 },
          headerTintColor: theme.colors.primary,
        }}
      />
    </Stack>
  );
}
