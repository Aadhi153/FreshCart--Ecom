import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react-native';
import { theme } from '@freshcart/ui';
import { useState } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GlassCard } from '../../components/GlassCard';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

export default function CartScreen() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([
    { id: '1', name: 'Farm Fresh Brown Eggs', price: 4.99, quantity: 2, category: 'Eggs' },
    { id: '4', name: 'Organic Carrots', price: 2.99, quantity: 1, category: 'Vegetables' },
  ]);

  const updateQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const delivery = 40;
  const total = subtotal + delivery;

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ShoppingBag size={64} color={theme.light.textSecondary} />
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>Add items from the shop to get started</Text>
        <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/(shop)/shop')}>
          <Text style={styles.shopBtnText}>Browse Shop</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Cart</Text>
        <Text style={styles.itemCount}>{items.length} items</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 70).springify()}>
            <GlassCard style={styles.cartItem} borderRadius={16}>
              <View style={styles.itemImagePlaceholder} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemCategory}>{item.category}</Text>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>
              </View>
              <View style={styles.itemControls}>
                <TouchableOpacity onPress={() => remove(item.id)} style={styles.deleteBtn}>
                  <Trash2 size={14} color="#E63946" />
                </TouchableOpacity>
                <View style={styles.qtyRow}>
                  <TouchableOpacity onPress={() => updateQty(item.id, -1)} style={styles.qtyBtn}>
                    <Minus size={14} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => updateQty(item.id, 1)} style={styles.qtyBtn}>
                    <Plus size={14} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </GlassCard>
          </Animated.View>
        )}
        ListFooterComponent={<View style={{ height: 220 }} />}
      />

      {/* Summary Footer */}
      <GlassCard style={styles.summary} borderRadius={0} intensity={55}>
        <View style={styles.summaryLine}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryLine}>
          <Text style={styles.summaryLabel}>Delivery</Text>
          <Text style={styles.summaryValue}>₹{delivery.toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryLine, styles.totalLine]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => router.push('/(shop)/checkout')}
        >
          <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
        </TouchableOpacity>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.light.layer0 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 24, paddingTop: 56,
    backgroundColor: theme.light.layer1,
    borderBottomWidth: 1, borderBottomColor: theme.light.borderColor,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: theme.light.textPrimary },
  itemCount: { fontSize: 14, color: theme.light.textSecondary },
  list: { padding: 16 },
  cartItem: {
    flexDirection: 'row',
    padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    gap: 12,
  },
  itemImagePlaceholder: {
    width: 72, height: 72, borderRadius: 12, backgroundColor: theme.light.layer0,
  },
  itemInfo: { flex: 1, justifyContent: 'center' },
  itemCategory: { fontSize: 10, color: theme.light.textSecondary, marginBottom: 2 },
  itemName: { fontSize: 14, fontWeight: '600', color: theme.light.textPrimary, marginBottom: 4 },
  itemPrice: { fontSize: 15, fontWeight: 'bold', color: theme.colors.accent },
  itemControls: { alignItems: 'flex-end', justifyContent: 'space-between' },
  deleteBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(230,57,70,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.light.layer0, borderRadius: 10, padding: 4,
  },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: `${theme.colors.primary}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyText: { fontSize: 15, fontWeight: '600', minWidth: 20, textAlign: 'center' },
  summary: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 10,
  },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: theme.light.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '500' },
  totalLine: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.light.borderColor },
  totalLabel: { fontSize: 16, fontWeight: 'bold' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: theme.colors.primary },
  checkoutBtn: {
    marginTop: 16, backgroundColor: theme.colors.primary,
    padding: 16, borderRadius: 16, alignItems: 'center',
  },
  checkoutBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: theme.light.textPrimary },
  emptySubtitle: { fontSize: 14, color: theme.light.textSecondary, textAlign: 'center' },
  shopBtn: {
    marginTop: 16, backgroundColor: theme.colors.primary,
    paddingHorizontal: 32, paddingVertical: 14, borderRadius: 9999,
  },
  shopBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
