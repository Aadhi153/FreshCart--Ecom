import styles from './ToggleSwitch.module.css';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`${styles.track} ${checked ? styles.trackOn : ''}`}
    >
      <span className={`${styles.thumb} ${checked ? styles.thumbOn : ''}`} />
    </button>
  );
}
