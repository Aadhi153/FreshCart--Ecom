import { useState, useEffect, useMemo } from 'react';
import type { ReturnRequest, ReturnRequestStatus } from '@freshcart/types';
import { RefreshCw, Search, RotateCcw, Check, X, PackageCheck, CheckCircle2 } from 'lucide-react';
import { Button, Card, EmptyState, Skeleton, Table, Thead, Tbody, Tr, Th, Td } from '@freshcart/ui';
import { getReturnRequests, updateReturnRequestStatus } from '../lib/api';
import { useToast } from '../components/ToastProvider';

const STATUS_FILTERS = ['all', 'requested', 'approved', 'rejected', 'picked_up', 'completed'] as const;

function statusStyle(status: string) {
  if (status === 'rejected') return { color: 'var(--danger)', background: 'var(--danger-tint)' };
  if (status === 'completed') return { color: 'var(--success)', background: 'var(--success-tint)' };
  return { color: 'var(--accent)', background: 'var(--accent-tint)' };
}

export default function Returns() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => { fetchRequests(); }, []);

  async function fetchRequests() {
    setLoading(true);
    try {
      const data = await getReturnRequests();
      setRequests(data);
    } catch (err) {
      console.error('Error fetching return requests:', err);
      showToast('Failed to load return requests', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: string, status: ReturnRequestStatus) {
    setActioningId(id);
    try {
      const updated = await updateReturnRequestStatus(id, status);
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
      showToast(`Marked as ${status.replace('_', ' ')}`, 'success');
    } catch (err) {
      console.error('Error updating return request:', err);
      showToast(err instanceof Error ? err.message : 'Failed to update request', 'error');
    } finally {
      setActioningId(null);
    }
  }

  const filtered = useMemo(() => {
    let result = requests;
    if (statusFilter !== 'all') result = result.filter((r) => r.status === statusFilter);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((r) => {
        const item = r.order_items as any;
        const profile = r.profiles as any;
        return (
          (r.order_id || '').toLowerCase().includes(q) ||
          (item?.products?.name || '').toLowerCase().includes(q) ||
          (profile?.full_name || '').toLowerCase().includes(q) ||
          (profile?.email || '').toLowerCase().includes(q)
        );
      });
    }
    return result;
  }, [requests, statusFilter, searchQuery]);

  const stats = useMemo(() => ({
    pending: requests.filter((r) => r.status === 'requested').length,
    inProgress: requests.filter((r) => r.status === 'approved' || r.status === 'picked_up').length,
    completed: requests.filter((r) => r.status === 'completed').length,
  }), [requests]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Returns &amp; Replacements</h1>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {requests.length} request{requests.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button variant="secondary" onClick={fetchRequests} disabled={loading} leftIcon={<RefreshCw size={14} />} />
      </div>

      <div className="kpi-grid">
        <Card className="kpi-card">
          <p className="kpi-title">Awaiting review</p>
          <h3 className="kpi-value">{stats.pending}</h3>
        </Card>
        <Card className="kpi-card">
          <p className="kpi-title">In progress</p>
          <h3 className="kpi-value">{stats.inProgress}</h3>
        </Card>
        <Card className="kpi-card">
          <p className="kpi-title">Completed</p>
          <h3 className="kpi-value">{stats.completed}</h3>
        </Card>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.1rem' }}
            placeholder="Search order, item, or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="form-input"
          style={{ maxWidth: 200 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as (typeof STATUS_FILTERS)[number])}
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <Card style={{ padding: '1.5rem' }}>
        <Table>
          <Thead>
            <Tr>
              <Th>Order</Th>
              <Th>Item</Th>
              <Th>Customer</Th>
              <Th>Type</Th>
              <Th>Reason</Th>
              <Th>Status</Th>
              <Th>Requested</Th>
              <Th style={{ textAlign: 'right' }}>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Tr key={i}><Td colSpan={8}><Skeleton height={34} /></Td></Tr>
              ))
            ) : filtered.length === 0 ? (
              <Tr>
                <Td colSpan={8}>
                  <EmptyState
                    icon={<RotateCcw size={28} />}
                    title={requests.length === 0 ? 'No return or replacement requests yet' : 'No requests match your filters'}
                  />
                </Td>
              </Tr>
            ) : (
              filtered.map((r) => {
                const item = r.order_items as any;
                const profile = r.profiles as any;
                const busy = actioningId === r.id;
                return (
                  <Tr key={r.id}>
                    <Td style={{ fontWeight: 600 }}>#{r.order_id?.slice(0, 8).toUpperCase()}</Td>
                    <Td style={{ maxWidth: 160 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item?.products?.name || 'Item'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Qty {item?.quantity ?? 1}</div>
                    </Td>
                    <Td style={{ fontSize: '0.85rem' }}>{profile?.full_name || profile?.email || '—'}</Td>
                    <Td style={{ textTransform: 'capitalize' }}>{r.type}</Td>
                    <Td style={{ fontSize: '0.85rem' }}>{r.reason}</Td>
                    <Td>
                      <span style={{ ...statusStyle(r.status || ''), padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize' }}>
                        {(r.status || '').replace('_', ' ')}
                      </span>
                    </Td>
                    <Td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {r.created_at && new Date(r.created_at).toLocaleDateString()}
                    </Td>
                    <Td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {r.status === 'requested' && (
                        <>
                          <button disabled={busy} onClick={() => handleAction(r.id!, 'approved')} title="Approve" style={{ padding: '0.4rem', background: 'transparent', border: 'none', color: 'var(--success)', cursor: 'pointer' }}>
                            <Check size={16} />
                          </button>
                          <button disabled={busy} onClick={() => handleAction(r.id!, 'rejected')} title="Reject" style={{ padding: '0.4rem', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                            <X size={16} />
                          </button>
                        </>
                      )}
                      {r.status === 'approved' && (
                        <button disabled={busy} onClick={() => handleAction(r.id!, 'picked_up')} title="Mark picked up" style={{ padding: '0.4rem', background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}>
                          <PackageCheck size={16} />
                        </button>
                      )}
                      {r.status === 'picked_up' && (
                        <button disabled={busy} onClick={() => handleAction(r.id!, 'completed')} title="Mark completed" style={{ padding: '0.4rem', background: 'transparent', border: 'none', color: 'var(--success)', cursor: 'pointer' }}>
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                      {(r.status === 'rejected' || r.status === 'completed') && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>—</span>
                      )}
                    </Td>
                  </Tr>
                );
              })
            )}
          </Tbody>
        </Table>
      </Card>
    </div>
  );
}
