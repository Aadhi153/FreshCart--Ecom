import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { theme } from '@freshcart/ui';
import { GlassCard } from '../components/GlassCard';
import { AnimatedPressable } from '../components/AnimatedPressable';

type Mode = 'login' | 'signup' | 'otp';

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email) { setError('Please enter your email'); return; }
    if (!password && mode !== 'otp') { setError('Please enter your password'); return; }
    setError('');
    setLoading(true);
    try {
      // Supabase auth calls would go here
      setTimeout(() => {
        setLoading(false);
        router.replace('/(shop)');
      }, 1000);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  const handleOTP = () => {
    if (!email) { setError('Please enter your email'); return; }
    router.push({ pathname: '/otp', params: { email } });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>🌿</Text>
          </View>
          <Text style={styles.brand}>FreshCart</Text>
          <Text style={styles.brandTagline}>Farm Fresh. Delivered Fast.</Text>
        </View>

        {/* Card */}
        <GlassCard style={styles.card} borderRadius={24}>
          <Text style={styles.cardTitle}>
            {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Magic Link'}
          </Text>
          <Text style={styles.cardSubtitle}>
            {mode === 'login'
              ? 'Sign in to continue shopping'
              : mode === 'signup'
              ? 'Join the FreshCart family'
              : 'We\'ll send a magic link to your email'}
          </Text>

          {error ? <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View> : null}

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputRow}>
              <Mail size={16} color={theme.light.textSecondary} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="you@example.com"
                placeholderTextColor={theme.light.textSecondary}
              />
            </View>
          </View>

          {/* Password (only for login/signup) */}
          {mode !== 'otp' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputRow}>
                <Lock size={16} color={theme.light.textSecondary} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  placeholderTextColor={theme.light.textSecondary}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword
                    ? <EyeOff size={16} color={theme.light.textSecondary} />
                    : <Eye size={16} color={theme.light.textSecondary} />}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Primary Button */}
          <AnimatedPressable
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={mode === 'otp' ? handleOTP : handleSubmit}
            disabled={loading}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Magic Link'}
            </Text>
            {!loading && <ArrowRight size={18} color="#fff" />}
          </AnimatedPressable>

          {/* OTP / Magic Link Option */}
          {mode !== 'otp' && (
            <>
              <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>OR</Text><View style={styles.dividerLine} /></View>
              <TouchableOpacity style={styles.otpBtn} onPress={() => setMode('otp')}>
                <Text style={styles.otpBtnText}>Sign in with Magic Link (OTP)</Text>
              </TouchableOpacity>
            </>
          )}
        </GlassCard>

        {/* Toggle */}
        <View style={styles.toggleRow}>
          {mode === 'login' ? (
            <>
              <Text style={styles.toggleText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => { setMode('signup'); setError(''); }}>
                <Text style={styles.toggleLink}>Sign Up</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.toggleText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => { setMode('login'); setError(''); }}>
                <Text style={styles.toggleLink}>Sign In</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity onPress={() => router.replace('/(shop)')} style={{ marginTop: 12 }}>
          <Text style={styles.skipText}>Skip for now →</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.light.layer0 },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60, alignItems: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: `${theme.colors.primary}18`,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoText: { fontSize: 36 },
  brand: { fontSize: 28, fontWeight: 'bold', color: theme.colors.primary },
  brandTagline: { fontSize: 13, color: theme.light.textSecondary, marginTop: 4 },
  card: {
    width: '100%',
    padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1, shadowRadius: 24, elevation: 8,
  },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: theme.light.textPrimary, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: theme.light.textSecondary, marginBottom: 20 },
  errorBanner: {
    backgroundColor: 'rgba(230,57,70,0.1)', borderRadius: 10,
    padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(230,57,70,0.2)',
  },
  errorText: { color: '#E63946', fontSize: 13 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: theme.light.textSecondary, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: theme.light.borderColor,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: theme.light.layer0,
  },
  input: { flex: 1, fontSize: 15, color: theme.light.textPrimary },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: theme.colors.primary,
    padding: 16, borderRadius: 14, marginTop: 8,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.light.borderColor },
  dividerText: { fontSize: 12, color: theme.light.textSecondary, fontWeight: '500' },
  otpBtn: {
    borderWidth: 1.5, borderColor: theme.colors.primary,
    padding: 14, borderRadius: 14, alignItems: 'center',
  },
  otpBtnText: { color: theme.colors.primary, fontSize: 14, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', marginTop: 24, alignItems: 'center' },
  toggleText: { fontSize: 14, color: theme.light.textSecondary },
  toggleLink: { fontSize: 14, color: theme.colors.primary, fontWeight: '700' },
  skipText: { fontSize: 13, color: theme.light.textSecondary, textDecorationLine: 'underline' },
});
