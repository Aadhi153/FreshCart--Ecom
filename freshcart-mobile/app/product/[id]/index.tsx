import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ShoppingCart, Star, Truck, Package, Check } from 'lucide-react-native';
import { theme } from '@freshcart/ui';
import { useState } from 'react';
import { GlassCard } from '../../../components/GlassCard';
import { AnimatedPressable } from '../../../components/AnimatedPressable';

const MOCK_PRODUCTS: Record<string, { name: string; price: number; compare_price?: number; category: string; description: string; stock: number }> = {
  '1': { name: 'Farm Fresh Brown Eggs', price: 4.99, compare_price: 6.99, category: 'Eggs', description: 'Free-range brown eggs from local farms. Laid fresh daily. Rich in protein and omega-3 fatty acids.', stock: 100 },
  '2': { name: 'White Eggs (6 pcs)', price: 2.49, category: 'Eggs', description: 'Classic white eggs, perfect for everyday cooking. Sourced from cage-free hens.', stock: 200 },
  '3': { name: 'Tender Coconut', price: 3.00, category: 'Coconuts', description: 'Refreshing tender coconut water. Naturally sweet and full of electrolytes.', stock: 50 },
  '4': { name: 'Organic Carrots', price: 2.99, category: 'Vegetables', description: 'Organically grown carrots. Perfect for salads, juices, and cooked meals.', stock: 80 },
};

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const product = MOCK_PRODUCTS[id] || MOCK_PRODUCTS['1'];
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);

  const handleAddToCart = () => {
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const discount = product.compare_price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : null;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Placeholder */}
        <View style={styles.imagePlaceholder}>
          {discount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}% OFF</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.category}>{product.category}</Text>
          <Text style={styles.name}>{product.name}</Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={14} fill={theme.colors.accent} color={theme.colors.accent} />
            ))}
            <Text style={styles.ratingText}>(128 reviews)</Text>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{product.price.toFixed(2)}</Text>
            {product.compare_price && (
              <Text style={styles.comparePrice}>₹{product.compare_price.toFixed(2)}</Text>
            )}
          </View>

          {/* Description */}
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>

          {/* Meta Info */}
          <GlassCard style={styles.metaCard} borderRadius={14}>
            <View style={styles.metaItem}>
              <Truck size={18} color={theme.colors.primary} />
              <Text style={styles.metaText}>Free delivery above ₹500</Text>
            </View>
            <View style={[styles.metaItem, { borderTopWidth: 1, borderTopColor: theme.light.borderColor }]}>
              <Package size={18} color={product.stock > 0 && product.stock < 5 ? '#B45309' : theme.colors.primary} />
              <Text style={[styles.metaText, product.stock > 0 && product.stock < 5 ? { color: '#B45309', fontWeight: '700' } : null]}>
                {product.stock <= 0 ? 'Out of Stock' : product.stock < 5 ? 'Low Stock' : 'In Stock'}
              </Text>
            </View>
          </GlassCard>

          {/* Quantity */}
          <Text style={styles.sectionLabel}>Quantity</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(Math.max(1, qty - 1))}>
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{qty}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(qty + 1)}>
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <GlassCard style={styles.bottomBar} borderRadius={0} intensity={55}>
        <View>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{(product.price * qty).toFixed(2)}</Text>
        </View>
        {product.stock <= 0 ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#B91C1C', fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>Currently unavailable</Text>
            <TouchableOpacity style={[styles.addBtn, { opacity: 0.5, backgroundColor: theme.light.layer2 }]} disabled>
              <Text style={[styles.addBtnText, { color: theme.light.textSecondary }]}>Out of Stock</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <AnimatedPressable
            style={[styles.addBtn, added && styles.addedBtn]}
            onPress={handleAddToCart}
            disabled={added}
          >
            {added ? <Check size={20} color="#fff" /> : <ShoppingCart size={20} color="#fff" />}
            <Text style={styles.addBtnText}>{added ? 'Added!' : 'Add to Cart'}</Text>
          </AnimatedPressable>
        )}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.light.layer0 },
  imagePlaceholder: {
    height: 300, backgroundColor: theme.light.layer1,
    alignItems: 'flex-end', padding: 16,
  },
  discountBadge: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999,
  },
  discountText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  content: { padding: 24 },
  category: { fontSize: 12, color: theme.colors.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  name: { fontSize: 24, fontWeight: 'bold', color: theme.light.textPrimary, lineHeight: 30, marginBottom: 12 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  ratingText: { fontSize: 13, color: theme.light.textSecondary, marginLeft: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginBottom: 20 },
  price: { fontSize: 28, fontWeight: 'bold', color: theme.colors.accent },
  comparePrice: { fontSize: 16, color: theme.light.textSecondary, textDecorationLine: 'line-through' },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: theme.light.textPrimary, marginBottom: 8 },
  description: { fontSize: 14, color: theme.light.textSecondary, lineHeight: 22, marginBottom: 20 },
  metaCard: {
    marginBottom: 24,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  metaText: { fontSize: 14, color: theme.light.textSecondary },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  qtyBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: `${theme.colors.primary}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 22, fontWeight: 'bold', color: theme.colors.primary },
  qtyValue: { fontSize: 20, fontWeight: 'bold', minWidth: 30, textAlign: 'center' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingBottom: 36,
    borderTopWidth: 1, borderTopColor: theme.light.borderColor,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
  },
  totalLabel: { fontSize: 12, color: theme.light.textSecondary },
  totalValue: { fontSize: 22, fontWeight: 'bold', color: theme.colors.primary },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
  },
  addedBtn: { backgroundColor: '#27ae60' },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
