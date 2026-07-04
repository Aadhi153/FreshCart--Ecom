import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '@freshcart/ui';
import { GlassCard } from '../../components/GlassCard';
import { AnimatedPressable } from '../../components/AnimatedPressable';

export default function CheckoutScreen() {
  return (
    <ScrollView style={styles.container}>
      <GlassCard style={styles.section}>
        <Text style={styles.sectionTitle}>1. Delivery Address</Text>
        <TextInput style={styles.input} placeholder="Full Name" />
        <TextInput style={[styles.input, { height: 80 }]} placeholder="Full Address" multiline />
      </GlassCard>

      <GlassCard style={styles.section}>
        <Text style={styles.sectionTitle}>2. Payment Method</Text>
        <TouchableOpacity style={styles.payButton}>
          <Text style={styles.payButtonText}>Pay with Card</Text>
        </TouchableOpacity>
      </GlassCard>

      <GlassCard style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>Total to pay</Text>
          <Text style={styles.summaryPrice}>$17.97</Text>
        </View>
        <AnimatedPressable style={styles.placeOrderBtn}>
          <Text style={styles.placeOrderBtnText}>Place Order</Text>
        </AnimatedPressable>
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.light.layer0,
  },
  section: {
    padding: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.light.borderColor,
    borderRadius: theme.radii.md,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  payButton: {
    borderWidth: 1,
    borderColor: theme.light.borderColor,
    borderRadius: theme.radii.md,
    padding: 16,
    alignItems: 'center',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 16,
    color: theme.light.textSecondary,
  },
  summaryPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  placeOrderBtn: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: theme.radii.md,
    alignItems: 'center',
  },
  placeOrderBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
