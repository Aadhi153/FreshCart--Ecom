import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Package, ChevronRight, Clock } from 'lucide-react-native';
import { theme } from '@freshcart/ui';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GlassCard } from '../../components/GlassCard';

const ORDERS = [
  {
    id: 'ORD-001',
    date: '25 Jun 2026',
    total: 17.97,
    status: 'Delivered',
    items: ['Farm Fresh Eggs x2', 'Organic Carrots x1'],
  },
  {
    id: 'ORD-002',
    date: '22 Jun 2026',
    total: 23.48,
    status: 'In Transit',
    items: ['FreshCart Tee x1', 'Coconut Chips x2'],
  },
  {
    id: 'ORD-003',
    date: '18 Jun 2026',
    total: 9.98,
    status: 'Delivered',
    items: ['Broccoli Head x2', 'Mixed Nuts x1'],
  },
];

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  Delivered: { bg: 'rgba(45,106,79,0.12)', fg: '#2D6A4F' },
  'In Transit': { bg: 'rgba(244,162,97,0.15)', fg: '#C47A35' },
  Placed: { bg: 'rgba(69,123,157,0.12)', fg: '#457B9D' },
  Cancelled: { bg: 'rgba(230,57,70,0.12)', fg: '#E63946' },
};

export default function OrdersScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      <FlatList
        data={ORDERS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.Placed;
          return (
            <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
              <TouchableOpacity activeOpacity={0.85}>
                <GlassCard style={styles.orderCard} borderRadius={16}>
                  <View style={styles.orderHeader}>
                    <View style={styles.orderIdRow}>
                      <Package size={16} color={theme.colors.primary} />
                      <Text style={styles.orderId}>{item.id}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.statusText, { color: statusStyle.fg }]}>{item.status}</Text>
                    </View>
                  </View>

                  <View style={styles.orderItems}>
                    {item.items.map((name) => (
                      <Text key={name} style={styles.itemName}>• {name}</Text>
                    ))}
                  </View>

                  <View style={styles.orderFooter}>
                    <View style={styles.dateRow}>
                      <Clock size={12} color={theme.light.textSecondary} />
                      <Text style={styles.orderDate}>{item.date}</Text>
                    </View>
                    <View style={styles.totalRow}>
                      <Text style={styles.orderTotal}>₹{item.total.toFixed(2)}</Text>
                      <ChevronRight size={16} color={theme.light.textSecondary} />
                    </View>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            </Animated.View>
          );
        }}
        ListHeaderComponent={
          <View style={styles.summary}>
            <Text style={styles.summaryText}>{ORDERS.length} orders placed</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.light.layer0 },
  header: {
    padding: 24, paddingTop: 56,
    backgroundColor: theme.light.layer1,
    borderBottomWidth: 1, borderBottomColor: theme.light.borderColor,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: theme.light.textPrimary },
  list: { padding: 16 },
  summary: {
    backgroundColor: `${theme.colors.primary}10`,
    padding: 12, borderRadius: 12, marginBottom: 16,
  },
  summaryText: { fontSize: 13, color: theme.colors.primary, fontWeight: '600', textAlign: 'center' },
  orderCard: {
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderIdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderId: { fontSize: 15, fontWeight: '700', color: theme.light.textPrimary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  orderItems: { gap: 4, marginBottom: 14 },
  itemName: { fontSize: 13, color: theme.light.textSecondary },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.light.borderColor, paddingTop: 12 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  orderDate: { fontSize: 12, color: theme.light.textSecondary },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  orderTotal: { fontSize: 16, fontWeight: 'bold', color: theme.colors.accent },
});
