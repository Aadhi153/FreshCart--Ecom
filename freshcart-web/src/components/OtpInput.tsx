'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import styles from './OtpInput.module.css';

interface OtpInputProps {
  length?: number;
  onComplete: (code: string) => void;
  status?: 'idle' | 'error' | 'success';
  errorKey?: number;
  disabled?: boolean;
  resetKey?: number | string;
}

export function OtpInput({ length = 6, onComplete, status = 'idle', errorKey = 0, disabled = false, resetKey = 0 }: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(''));
  const [trackedResetKey, setTrackedResetKey] = useState(resetKey);
  const [trackedErrorKey, setTrackedErrorKey] = useState(errorKey);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Clear the boxes synchronously during render when the parent signals a new
  // challenge (resetKey changed) or a failed verify (errorKey changed) — this
  // is React's "adjust state during render" pattern rather than state-in-effect.
  if (resetKey !== trackedResetKey) {
    setTrackedResetKey(resetKey);
    setDigits(Array(length).fill(''));
  }
  if (status === 'error' && errorKey !== 0 && errorKey !== trackedErrorKey) {
    setTrackedErrorKey(errorKey);
    setDigits(Array(length).fill(''));
  }

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, [resetKey, errorKey]);

  // The shake is driven purely by remounting the row (via `key` below) so the
  // CSS animation replays on every failed attempt without any timer/state.
  const shakeNow = status === 'error' && errorKey !== 0;

  const focusInput = (index: number) => {
    const target = inputRefs.current[index];
    target?.focus();
    target?.select();
  };

  const handleChange = (index: number, rawValue: string) => {
    const digitsOnly = rawValue.replace(/\D/g, '');

    if (digitsOnly.length > 1) {
      // Fast typing or mobile SMS autofill can deliver multiple characters in
      // one change event instead of firing a paste event.
      setDigits((prev) => {
        const next = [...prev];
        let cursor = index;
        for (const char of digitsOnly) {
          if (cursor >= length) break;
          next[cursor] = char;
          cursor += 1;
        }
        if (next.every((d) => d !== '')) onComplete(next.join(''));
        focusInput(Math.min(cursor, length - 1));
        return next;
      });
      return;
    }

    setDigits((prev) => {
      const next = [...prev];
      next[index] = digitsOnly;
      if (digitsOnly && next.every((d) => d !== '')) onComplete(next.join(''));
      return next;
    });

    if (digitsOnly && index < length - 1) focusInput(index + 1);
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (digits[index]) {
        setDigits((prev) => { const next = [...prev]; next[index] = ''; return next; });
      } else if (index > 0) {
        setDigits((prev) => { const next = [...prev]; next[index - 1] = ''; return next; });
        focusInput(index - 1);
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1);
    } else if (event.key === 'ArrowRight' && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    event.preventDefault();
    const next = Array(length).fill('');
    for (let i = 0; i < pasted.length; i += 1) next[i] = pasted[i];
    setDigits(next);
    if (pasted.length === length) {
      onComplete(pasted);
      focusInput(length - 1);
    } else {
      focusInput(pasted.length);
    }
  };

  return (
    <div key={`${resetKey}-${errorKey}`} className={`${styles.row} ${shakeNow ? styles.shake : ''}`}>
      {digits.map((digit, index) => (
        <div key={index} className={styles.boxWrap}>
          <input
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={digit}
            disabled={disabled || status === 'success'}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            onFocus={(event) => event.target.select()}
            aria-label={`Digit ${index + 1} of ${length}`}
            className={`${styles.box} ${status === 'error' ? styles.boxError : ''} ${status === 'success' ? styles.boxSuccess : ''}`}
          />
          {status === 'success' && digit && (
            <span className={styles.checkOverlay}>
              <Check size={12} />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
