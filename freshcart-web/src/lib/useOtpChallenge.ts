import { useEffect, useState } from 'react';

type Stage = 'idle' | 'sending' | 'sent' | 'verifying' | 'success';

interface UseOtpChallengeOptions {
  sendOtp: () => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  cooldownSeconds?: number;
}

export function useOtpChallenge({ sendOtp, verifyOtp, cooldownSeconds = 30 }: UseOtpChallengeOptions) {
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [errorKey, setErrorKey] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const send = async () => {
    setStage('sending');
    setError('');
    try {
      await sendOtp();
      setStage('sent');
      setSecondsLeft(cooldownSeconds);
    } catch (err) {
      setStage('idle');
      setError(err instanceof Error ? err.message : 'Failed to send OTP. Please try again.');
    }
  };

  const verify = async (code: string) => {
    setStage('verifying');
    setError('');
    try {
      await verifyOtp(code);
      setStage('success');
    } catch (err) {
      setStage('sent');
      setError(err instanceof Error ? err.message : 'Invalid OTP. Please try again.');
      setErrorKey((k) => k + 1);
    }
  };

  const reset = () => {
    setStage('idle');
    setError('');
    setSecondsLeft(0);
    setErrorKey(0);
  };

  return {
    stage,
    error,
    secondsLeft,
    errorKey,
    send,
    verify,
    reset,
    canResend: stage === 'sent' && secondsLeft <= 0,
  };
}
