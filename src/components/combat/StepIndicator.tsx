import styles from './StepIndicator.module.css';

interface StepIndicatorProps {
  steps: string[];      // e.g. ['Weapon', 'Roll', 'Damage', 'Result']
  currentStep: number;  // 0-indexed
}

function getStepStatus(index: number, currentStep: number): 'completed' | 'current' | 'upcoming' {
  if (index < currentStep) return 'completed';
  if (index === currentStep) return 'current';
  return 'upcoming';
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className={styles.container} role="group" aria-label="Step progress">
      {steps.map((step, index) => {
        const status = getStepStatus(index, currentStep);
        return (
          <div key={step} className={styles.step}>
            <div className={styles.bar}>
              <div className={`${styles.segment} ${styles[status]}`} />
              <div className={`${styles.dot} ${styles[status]}`} aria-current={status === 'current' ? 'step' : undefined} />
            </div>
            <span className={`${styles.label} ${styles[status]}`}>
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}
