interface StatusCardProps {
  isVisible: boolean;
  onChange: (isVisible: boolean) => void;
}

export default function StatusCard({ isVisible, onChange }: StatusCardProps) {
  return (
    <div className="pf-card">
      <h3 className="pf-card-title">Status</h3>

      <div className="pf-status-row">
        <span className="pf-status-label">Visible in store</span>
        <button
          type="button"
          role="switch"
          aria-checked={isVisible}
          aria-label="Visible in store"
          className={`pf-toggle${isVisible ? ' pf-toggle-on' : ''}`}
          onClick={() => onChange(!isVisible)}
        >
          <span className="pf-toggle-thumb" />
        </button>
      </div>
    </div>
  );
}
