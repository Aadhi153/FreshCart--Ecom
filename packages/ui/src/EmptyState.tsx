import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="fc-empty-state">
      {icon && <div className="fc-empty-state-icon">{icon}</div>}
      <p className="fc-empty-state-title">{title}</p>
      {description && <p className="fc-empty-state-description">{description}</p>}
      {action && <div className="fc-empty-state-action">{action}</div>}
    </div>
  );
}
