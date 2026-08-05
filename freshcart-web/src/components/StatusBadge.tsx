import styles from './StatusBadge.module.css';

type OrderStatusKind = 'placed' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
type ReturnStatusKind = 'requested' | 'approved' | 'picked_up' | 'completed' | 'rejected';

interface StatusBadgeProps {
  status: string;
  kind: 'order' | 'return';
}

// Return statuses reuse the order palette so the whole account section shares one
// color vocabulary instead of a second invented one: requested/approved/picked_up
// map to the in-progress colors (blue/violet/amber), completed=delivered green,
// rejected=cancelled red.
const RETURN_TO_ORDER_COLOR: Record<ReturnStatusKind, OrderStatusKind> = {
  requested: 'placed',
  approved: 'shipped',
  picked_up: 'packed',
  completed: 'delivered',
  rejected: 'cancelled',
};

const LABELS: Record<ReturnStatusKind, string> = {
  requested: 'Requested',
  approved: 'Approved',
  picked_up: 'Picked up',
  completed: 'Completed',
  rejected: 'Rejected',
};

export function StatusBadge({ status, kind }: StatusBadgeProps) {
  const colorKey: OrderStatusKind = kind === 'order'
    ? (status as OrderStatusKind)
    : RETURN_TO_ORDER_COLOR[status as ReturnStatusKind] || 'placed';

  const label = kind === 'order' ? status : (LABELS[status as ReturnStatusKind] || status);

  return (
    <span className={`${styles.badge} ${styles[colorKey] || styles.placed}`}>
      {label}
    </span>
  );
}
