'use client';

import { Check } from 'lucide-react';
import styles from './CheckoutStepper.module.css';

export interface CheckoutStep {
  label: string;
}

interface CheckoutStepperProps {
  steps: CheckoutStep[];
  activeStep: number; // 1-indexed
}

export function CheckoutStepper({ steps, activeStep }: CheckoutStepperProps) {
  return (
    <div className={styles.stepper} role="list" aria-label="Checkout progress">
      {steps.map((step, index) => {
        const stepNum = index + 1;
        const isCompleted = stepNum < activeStep;
        const isActive = stepNum === activeStep;

        return (
          <div key={step.label} className={styles.stepWrap} role="listitem">
            {index > 0 && (
              <div className={`${styles.connector} ${stepNum <= activeStep ? styles.connectorFilled : ''}`} />
            )}
            <div className={styles.step}>
              <div
                className={`${styles.circle} ${isCompleted ? styles.circleCompleted : ''} ${isActive ? styles.circleActive : ''}`}
                aria-current={isActive ? 'step' : undefined}
              >
                {isCompleted ? <Check size={16} strokeWidth={3} /> : stepNum}
              </div>
              <span className={`${styles.label} ${isActive ? styles.labelActive : ''} ${isCompleted ? styles.labelCompleted : ''}`}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
