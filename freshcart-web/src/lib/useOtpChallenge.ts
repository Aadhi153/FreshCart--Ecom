import { useEffect, useState } from 'react';

type Stage = 'idle' | 'sending' | 'sent' | 'verifying' | 'success';

interface UseOtpChallengeOptions {
  sendOtp: () => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  cooldownSeconds?: number;
}

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError && /fetch/i.test(err.message);
}

function describeError(err: unknown, fallback: string): string {
  if (isNetworkError(err)) {
    return 'Network error — check your connection and try again.';
  }
  if (err instanceof Error && err.message && err.message.trim() !== '{}') {
    return err.message;
  }
  console.error('OTP challenge error (no usable message from server):', err);
  return fallback;
}

async function withNetworkRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!isNetworkError(err)) throw err;
    await new Promise((resolve) => setTimeout(resolve, 800));
    return fn();
  }
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
      await withNetworkRetry(sendOtp);
      setStage('sent');
      setSecondsLeft(cooldownSeconds);
    } catch (err) {
      setStage('idle');
      setError(describeError(err, 'Failed to send OTP. Please try again in a few minutes.'));
    }
  };

  const verify = async (code: string) => {
    setStage('verifying');
    setError('');
    try {
      await withNetworkRetry(() => verifyOtp(code));
      setStage('success');
    } catch (err) {
      setStage('sent');
      setError(describeError(err, 'Invalid OTP. Please try again.'));
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
