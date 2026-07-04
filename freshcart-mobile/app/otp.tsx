import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CheckCircle } from 'lucide-react-native';
import { theme } from '@freshcart/ui';

export default function OTPScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const refs = useRef<(TextInput | null)[]>([]);

  const handleChange = (val: string, idx: number) => {
    const newOtp = [...otp];
    newOtp[idx] = val.replace(/[^0-9]/g, '');
    setOtp(newOtp);
    if (val && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const code = otp.join('');
    if (code.length !== 6) return;
    setLoading(true);
    // Supabase OTP verify would go here
    setTimeout(() => {
      setLoading(false);
      setVerified(true);
      setTimeout(() => router.replace('/(shop)'), 1500);
    }, 1200);
  };

  const handleResend = () => {
    setOtp(['', '', '', '', '', '']);
    refs.current[0]?.focus();
  };

  if (verified) {
    return (
      <View style={styles.successContainer}>
        <CheckCircle size={72} color={theme.colors.primary} />
        <Text style={styles.successTitle}>Verified!</Text>
        <Text style={styles.successSubtitle}>Taking you to the shop...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <ArrowLeft size={20} color={theme.colors.primary} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.emoji}>📧</Text>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{'\n'}
          <Text style={styles.emailHighlight}>{email}</Text>
        </Text>

        {/* OTP Inputs */}
        <View style={styles.otpRow}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(el) => { refs.current[idx] = el; }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              value={digit}
              onChangeText={(val) => handleChange(val, idx)}
              onKeyPress={(e) => handleKeyPress(e, idx)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.verifyBtn, (otp.join('').length !== 6 || loading) && styles.verifyBtnDisabled]}
          onPress={handleVerify}
          disabled={otp.join('').length !== 6 || loading}
        >
          <Text style={styles.verifyBtnText}>
            {loading ? 'Verifying...' : 'Verify Code'}
          </Text>
        </TouchableOpacity>

        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn't receive it? </Text>
          <TouchableOpacity onPress={handleResend}>
            <Text style={styles.resendLink}>Resend Code</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.light.layer0 },
  backBtn: { margin: 24, marginTop: 56, alignSelf: 'flex-start' },
  content: { flex: 1, paddingHorizontal: 24, alignItems: 'center', paddingTop: 32 },
  emoji: { fontSize: 56, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: theme.light.textPrimary, marginBottom: 10 },
  subtitle: { fontSize: 15, color: theme.light.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  emailHighlight: { color: theme.colors.primary, fontWeight: '600' },
  otpRow: { flexDirection: 'row', gap: 12, marginBottom: 36 },
  otpBox: {
    width: 50, height: 58,
    borderWidth: 1.5, borderColor: theme.light.borderColor,
    borderRadius: 14, textAlign: 'center',
    fontSize: 22, fontWeight: 'bold', color: theme.light.textPrimary,
    backgroundColor: theme.light.layer1,
  },
  otpBoxFilled: { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}08` },
  verifyBtn: {
    width: '100%', backgroundColor: theme.colors.primary,
    padding: 16, borderRadius: 14, alignItems: 'center',
  },
  verifyBtnDisabled: { opacity: 0.5 },
  verifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendRow: { flexDirection: 'row', marginTop: 20 },
  resendLabel: { fontSize: 14, color: theme.light.textSecondary },
  resendLink: { fontSize: 14, color: theme.colors.primary, fontWeight: '700' },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: theme.light.layer0 },
  successTitle: { fontSize: 28, fontWeight: 'bold', color: theme.light.textPrimary },
  successSubtitle: { fontSize: 15, color: theme.light.textSecondary },
});
