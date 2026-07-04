import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import {
  User, ShoppingBag, Bell, Shield, HelpCircle,
  ChevronRight, LogOut, Moon, MapPin
} from 'lucide-react-native';
import { theme } from '@freshcart/ui';
import { useState } from 'react';
import { GlassCard } from '../../components/GlassCard';

export default function ProfileScreen() {
  const router = useRouter();
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const menuSections = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Edit Profile', action: () => {} },
        { icon: MapPin, label: 'Saved Addresses', action: () => {} },
        { icon: ShoppingBag, label: 'My Orders', action: () => router.push('/(shop)/orders') },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: Bell, label: 'Push Notifications',
          toggle: true, value: notificationsOn,
          onToggle: () => setNotificationsOn(!notificationsOn),
        },
        {
          icon: Moon, label: 'Dark Mode',
          toggle: true, value: darkMode,
          onToggle: () => setDarkMode(!darkMode),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help & FAQ', action: () => {} },
        { icon: Shield, label: 'Privacy Policy', action: () => {} },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>A</Text>
        </View>
        <Text style={styles.userName}>Admin User</Text>
        <Text style={styles.userEmail}>user@freshcart.com</Text>
        <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/auth')}>
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <GlassCard style={styles.statsRow} borderRadius={16}>
        {[{ label: 'Orders', value: '12' }, { label: 'Wishlist', value: '5' }, { label: 'Reviews', value: '8' }].map(({ label, value }) => (
          <View key={label} style={styles.statItem}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </GlassCard>

      {/* Menu Sections */}
      {menuSections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <GlassCard style={styles.sectionCard} borderRadius={16}>
            {section.items.map((item: any, idx) => (
              <View key={item.label}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={item.action}
                  disabled={item.toggle}
                  activeOpacity={item.toggle ? 1 : 0.7}
                >
                  <View style={styles.menuLeft}>
                    <View style={styles.menuIcon}>
                      <item.icon size={18} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                  </View>
                  {item.toggle ? (
                    <Switch
                      value={item.value}
                      onValueChange={item.onToggle}
                      trackColor={{ false: theme.light.borderColor, true: `${theme.colors.primary}80` }}
                      thumbColor={item.value ? theme.colors.primary : '#ccc'}
                    />
                  ) : (
                    <ChevronRight size={18} color={theme.light.textSecondary} />
                  )}
                </TouchableOpacity>
                {idx < section.items.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </GlassCard>
        </View>
      ))}

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={() => router.replace('/auth')}>
        <LogOut size={18} color="#E63946" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.light.layer0 },
  profileCard: {
    backgroundColor: theme.colors.primary,
    padding: 32, paddingTop: 60,
    alignItems: 'center',
  },
  avatarLarge: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  userEmail: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 16 },
  editBtn: {
    paddingHorizontal: 24, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  editBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  statsRow: {
    flexDirection: 'row',
    margin: 16, marginTop: -16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: theme.light.textPrimary },
  statLabel: { fontSize: 12, color: theme.light.textSecondary, marginTop: 2 },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: theme.light.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCard: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${theme.colors.primary}12`,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { fontSize: 15, fontWeight: '500', color: theme.light.textPrimary },
  divider: { height: 1, backgroundColor: theme.light.borderColor, marginHorizontal: 16 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginHorizontal: 16, marginTop: 8,
    padding: 16, borderRadius: 16,
    backgroundColor: 'rgba(230,57,70,0.08)',
    borderWidth: 1, borderColor: 'rgba(230,57,70,0.2)',
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: '#E63946' },
});
