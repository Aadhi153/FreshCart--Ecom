import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, ChevronRight, Leaf, Egg, Shirt, Cookie } from 'lucide-react-native';
import { theme } from '@freshcart/ui';
import { GlassCard } from '../../components/GlassCard';

const categories = [
  { label: 'Eggs', icon: Egg, color: '#F4A261' },
  { label: 'Vegetables', icon: Leaf, color: '#2D6A4F' },
  { label: 'T-Shirts', icon: Shirt, color: '#457B9D' },
  { label: 'Snacks', icon: Cookie, color: '#E63946' },
];

const featured = [
  { id: '1', name: 'Farm Fresh Eggs', price: 4.99, category: 'Eggs' },
  { id: '2', name: 'Organic Carrots', price: 2.99, category: 'Vegetables' },
  { id: '3', name: 'FreshCart Tee', price: 19.99, category: 'T-Shirts' },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good Morning 👋</Text>
          <Text style={styles.tagline}>What are you looking for?</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/profile')} style={styles.avatarBtn}>
          <Text style={styles.avatarText}>A</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={16} color={theme.light.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search eggs, veggies, snacks..."
          placeholderTextColor={theme.light.textSecondary}
          onFocus={() => router.push('/(shop)/shop')}
        />
      </View>

      {/* Hero Banner */}
      <View style={styles.heroBanner}>
        <Text style={styles.heroText}>🥚 Fresh Eggs</Text>
        <Text style={styles.heroSub}>Farm to door in 30 min</Text>
        <TouchableOpacity
          style={styles.heroBtn}
          onPress={() => router.push('/(shop)/shop')}
        >
          <Text style={styles.heroBtnText}>Shop Now</Text>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity onPress={() => router.push('/(shop)/shop')}>
            <Text style={styles.seeAll}>See All <ChevronRight size={12} color={theme.colors.primary} /></Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map(({ label, icon: Icon, color }) => (
            <TouchableOpacity
              key={label}
              style={[styles.categoryChip, { borderColor: color }]}
              onPress={() => router.push('/(shop)/shop')}
            >
              <View style={[styles.categoryIcon, { backgroundColor: `${color}20` }]}>
                <Icon size={20} color={color} />
              </View>
              <Text style={[styles.categoryLabel, { color }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Featured Products */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured</Text>
          <TouchableOpacity onPress={() => router.push('/(shop)/shop')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
          {featured.map((product) => (
            <TouchableOpacity
              key={product.id}
              onPress={() => router.push(`/product/${product.id}`)}
              activeOpacity={0.85}
            >
              <GlassCard style={styles.productCard} borderRadius={16}>
                <View style={styles.productImage} />
                <Text style={styles.productCategory}>{product.category}</Text>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productPrice}>₹{product.price.toFixed(2)}</Text>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.light.layer0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 56,
  },
  greeting: {
    fontSize: 14,
    color: theme.light.textSecondary,
  },
  tagline: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.light.textPrimary,
    marginTop: 4,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 20,
    backgroundColor: theme.light.layer1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.light.borderColor,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.light.textPrimary,
  },
  heroBanner: {
    marginHorizontal: 24,
    marginBottom: 28,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    padding: 24,
  },
  heroText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 14,
    color: '#B7D9C6',
    marginBottom: 16,
  },
  heroBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  heroBtnText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  section: {
    marginBottom: 28,
    paddingLeft: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingRight: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.light.textPrimary,
  },
  seeAll: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  categoryChip: {
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: theme.light.layer1,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    minWidth: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  productCard: {
    width: 170,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  productImage: {
    height: 110,
    backgroundColor: theme.light.layer0,
    borderRadius: 12,
    marginBottom: 12,
  },
  productCategory: {
    fontSize: 11,
    color: theme.light.textSecondary,
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.light.textPrimary,
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.accent,
  },
});
