import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, SlidersHorizontal, Plus } from 'lucide-react-native';
import { theme } from '@freshcart/ui';
import { useState } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GlassCard } from '../../components/GlassCard';
import { AnimatedPressable } from '../../components/AnimatedPressable';

const ALL_PRODUCTS = [
  { id: '1', name: 'Farm Fresh Brown Eggs', price: 4.99, category: 'Eggs' },
  { id: '2', name: 'White Eggs (6 pcs)', price: 2.49, category: 'Eggs' },
  { id: '3', name: 'Tender Coconut', price: 3.00, category: 'Coconuts' },
  { id: '4', name: 'Organic Carrots', price: 2.99, category: 'Vegetables' },
  { id: '5', name: 'Broccoli Head', price: 1.99, category: 'Vegetables' },
  { id: '6', name: 'FreshCart Logo Tee', price: 19.99, category: 'T-Shirts' },
  { id: '7', name: 'Coconut Chips', price: 1.49, category: 'Snacks' },
  { id: '8', name: 'Mixed Nuts (100g)', price: 5.99, category: 'Snacks' },
];

const CATEGORIES = ['All', 'Eggs', 'Coconuts', 'Vegetables', 'T-Shirts', 'Snacks'];

export default function ShopScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = ALL_PRODUCTS.filter((p) => {
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shop</Text>
        <TouchableOpacity style={styles.filterBtn}>
          <SlidersHorizontal size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Search size={16} color={theme.light.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor={theme.light.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category pills */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={CATEGORIES}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.pills}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setActiveCategory(item)}
            style={[styles.pill, activeCategory === item && styles.pillActive]}
          >
            <Text style={[styles.pillText, activeCategory === item && styles.pillTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Product Grid */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Animated.View style={styles.productCard} entering={FadeInDown.delay((index % 10) * 60).springify()}>
            <TouchableOpacity
              onPress={() => router.push(`/product/${item.id}`)}
              activeOpacity={0.85}
            >
              <GlassCard style={styles.productCardInner} borderRadius={16}>
                <View style={styles.productImage} />
                <Text style={styles.productCategory}>{item.category}</Text>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <View style={styles.productFooter}>
                  <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
                  <AnimatedPressable style={styles.addBtn}>
                    <Plus size={16} color="#fff" />
                  </AnimatedPressable>
                </View>
              </GlassCard>
            </TouchableOpacity>
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.light.layer0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 56,
    backgroundColor: theme.light.layer1,
    borderBottomWidth: 1,
    borderBottomColor: theme.light.borderColor,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: theme.light.textPrimary },
  filterBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: `${theme.colors.primary}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, backgroundColor: theme.light.layer1,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: theme.light.borderColor,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: theme.light.textPrimary },
  pills: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 9999, borderWidth: 1,
    borderColor: theme.light.borderColor,
    backgroundColor: theme.light.layer1,
  },
  pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { fontSize: 13, fontWeight: '500', color: theme.light.textSecondary },
  pillTextActive: { color: '#fff' },
  grid: { padding: 8 },
  productCard: {
    flex: 1, margin: 8,
  },
  productCardInner: {
    padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  productImage: {
    height: 120, backgroundColor: theme.light.layer0,
    borderRadius: 10, marginBottom: 10,
  },
  productCategory: { fontSize: 10, color: theme.light.textSecondary, marginBottom: 4 },
  productName: { fontSize: 13, fontWeight: '600', color: theme.light.textPrimary, marginBottom: 8 },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productPrice: { fontSize: 15, fontWeight: 'bold', color: theme.colors.accent },
  addBtn: {
    width: 30, height: 30, borderRadius: 9999,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: theme.light.textSecondary, fontSize: 15 },
});
