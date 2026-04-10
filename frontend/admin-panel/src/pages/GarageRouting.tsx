import { useState, useEffect, useCallback } from 'react';
import { api, GarageRoutingEntry, GarageEntry } from '../lib/api';
import { useAppContext } from '../store/data';

const ISSUE_LABEL: Record<string, string> = {
  battery_failure: 'Battery Cell Degradation',
  engine_overheat: 'Engine Overheating',
  low_oil_life:    'Low Oil Life',
};
const ISSUE_ICON: Record<string, string> = {
  battery_failure: 'fa-battery-quarter',
  engine_overheat: 'fa-temperature-high',
  low_oil_life:    'fa-oil-can',
};
const URGENCY_COLOR: Record<string, string> = {
  Critical: 'var(--danger)',
  High:     '#f97316',
  Medium:   'var(--warning)',
  Low:      'var(--success)',
};

function GarageRow({ g, isLast }: { g: GarageEntry; isLast: boolean }) {
  let state: 'rejected' | 'current' | 'queued' | 'standby' = 'standby';
  if (g.rejected) state = 'rejected';
  else if (g.current) state = 'current';
  else if (!g.tried && g.rank === 1) state = 'queued';

  const borderColor =
    state === 'rejected' ? 'var(--danger)' :
    state === 'current'  ? 'var(--primary)' :
    state === 'queued'   ? 'var(--warning)' :
    'var(--border)';

  const bgColor =
    state === 'rejected' ? 'rgba(239,68,68,0.06)' :
    state === 'current'  ? 'rgba(99,102,241,0.08)' :
    state === 'queued'   ? 'rgba(245,158,11,0.07)' :
    'transparent';

  const stateLabel =
    state === 'rejected' ? '✗ Rejected' :
    state === 'current'  ? '▶ Active' :
    state === 'queued'   ? '⏳ Next in Queue' :
    '— Standby';

  const stateColor =
    state === 'rejected' ? 'var(--danger)' :
    state === 'current'  ? 'var(--primary)' :
    state === 'queued'   ? 'var(--warning)' :
    'var(--text-muted)';

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
      {/* Rank + connector */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: state === 'rejected' ? 'var(--danger)' : state === 'current' ? 'var(--primary)' : 'var(--surface)',
          border: `2px solid ${borderColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 13,
          color: (state === 'rejected' || state === 'current') ? '#fff' : 'var(--text-muted)',
          flexShrink: 0,
        }}>
          {g.rank}
        </div>
        {!isLast && (
          <div style={{
            flex: 1, width: 2, minHeight: 24,
            background: state === 'rejected' ? 'var(--danger)' : 'var(--border)',
            margin: '4px 0',
          }} />
        )}
      </div>

      {/* Card */}
      <div style={{
        flex: 1, marginLeft: 12, marginBottom: isLast ? 0 : 16,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 10, padding: '12px 16px',
        background: bgColor,
        transition: 'all 0.3s',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{g.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{g.address}</div>
          </div>
          <span style={{ fontWeight: 600, fontSize: 12, color: stateColor, whiteSpace: 'nowrap' }}>{stateLabel}</span>
        </div>

        <div style={{ display: 'flex', gap: 20, marginTop: 10, flexWrap: 'wrap' }}>
          <Metric icon="fa-star" color="var(--warning)" label={`${g.rating.toFixed(1)} ★`} />
          <Metric icon="fa-location-dot" color="var(--accent-teal)" label={`${g.distance_km} km`} />
          <Metric icon="fa-layer-group" color="var(--primary)" label={`${g.slots} slots`} />
          <Metric icon="fa-brain" color="var(--accent-purple)" label={`Score ${(g.score * 100).toFixed(0)}`} />
        </div>

        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {g.specializations.map(s => (
            <span key={s} style={{
              fontSize: 11, fontWeight: 500,
              padding: '2px 8px', borderRadius: 999,
              background: 'var(--surface)', border: '1px solid var(--border)',
              color: 'var(--text-muted)',
            }}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, color, label }: { icon: string; color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)' }}>
      <i className={`fa-solid ${icon}`} style={{ color, fontSize: 11 }}></i>
      {label}
    </span>
  );
}

export const GarageRouting = () => {
  const { addToast } = useAppContext();
  const [entries, setEntries] = useState<GarageRoutingEntry[]>([]);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Record<string, string>>({});
  const [lastUpdated, setLastUpdated] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.getGarageRouting();
      setEntries(data);
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch {
      // backend unreachable
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [load]);

  const handleReject = async (entry: GarageRoutingEntry) => {
    if (!entry.booking_id) {
      addToast('No active booking to reject for this request.', 'warning');
      return;
    }
    const currentGarage = entry.garages.find(g => g.current);
    const nextGarage    = entry.garages.find(g => !g.tried && !g.current && g.slots > 0);

    setRejecting(entry.request_id);
    try {
      await api.cancelBooking(entry.booking_id);
      const msg = nextGarage
        ? `Rejected ${currentGarage?.name ?? 'garage'}. Notification sent to #${nextGarage.rank}: ${nextGarage.name}`
        : `Rejected ${currentGarage?.name ?? 'garage'}. No more garages available — escalating.`;
      addToast(msg, nextGarage ? 'info' : 'error');
      setNotifications(prev => ({ ...prev, [entry.request_id]: msg }));
      setTimeout(() => load(), 1200);
    } catch {
      addToast('Failed to reject garage — is backend running?', 'error');
    } finally {
      setRejecting(null);
    }
  };

  if (entries.length === 0) {
    return (
      <section className="white-card animate-in">
        <div className="section-header">
          <h2>
            <i className="fa-solid fa-route" style={{ color: 'var(--primary)' }}></i> AI Garage Routing
          </h2>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Live · refreshes every 4s</span>
        </div>
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-circle-check" style={{ fontSize: 40, color: 'var(--success)', display: 'block', marginBottom: 16 }}></i>
          <strong>No active routing in progress.</strong>
          <p style={{ margin: '8px 0 0', fontSize: 13 }}>
            All service requests are resolved. Trigger a new issue from the Dashboard to see the AI routing pipeline.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="white-card animate-in">
      <div className="section-header">
        <h2>
          <i className="fa-solid fa-route" style={{ color: 'var(--primary)' }}></i> AI Garage Routing
        </h2>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Live · refreshes every 4s · last sync {lastUpdated}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {entries.map(entry => {
          const currentGarage = entry.garages.find(g => g.current);
          const nextGarage    = entry.garages.find(g => !g.tried && !g.current && g.slots > 0);
          const notification  = notifications[entry.request_id];

          return (
            <div key={entry.request_id} style={{
              border: '1px solid var(--border)',
              borderRadius: 14, overflow: 'hidden',
            }}>
              {/* Request header */}
              <div style={{
                padding: '14px 20px',
                background: 'var(--surface)',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
                  <i
                    className={`fa-solid ${ISSUE_ICON[entry.issue] ?? 'fa-wrench'}`}
                    style={{ fontSize: 22, color: URGENCY_COLOR[entry.urgency] ?? 'var(--primary)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {entry.vehicle_id} — {entry.model}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {entry.owner} · {ISSUE_LABEL[entry.issue] ?? entry.issue} · {entry.confidence}% confidence
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                    background: `${URGENCY_COLOR[entry.urgency] ?? 'var(--primary)'}22`,
                    color: URGENCY_COLOR[entry.urgency] ?? 'var(--primary)',
                    border: `1px solid ${URGENCY_COLOR[entry.urgency] ?? 'var(--primary)'}55`,
                  }}>
                    {entry.urgency} Urgency
                  </span>
                  <span style={{
                    padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}>
                    {entry.status.replace('_', ' ')}
                  </span>

                  {/* Reject button — only show when there's an active booking */}
                  {entry.booking_id && entry.booking_status !== 'COMPLETED' && entry.booking_status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleReject(entry)}
                      disabled={rejecting === entry.request_id}
                      style={{
                        padding: '6px 16px', borderRadius: 8, border: '1.5px solid var(--danger)',
                        background: rejecting === entry.request_id ? 'var(--danger)' : 'transparent',
                        color: rejecting === entry.request_id ? '#fff' : 'var(--danger)',
                        fontWeight: 600, fontSize: 12, cursor: 'pointer',
                        transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <i className={`fa-solid ${rejecting === entry.request_id ? 'fa-spinner fa-spin' : 'fa-xmark'}`}></i>
                      {rejecting === entry.request_id ? 'Rejecting…' : `Reject ${currentGarage?.name ?? 'Current'}`}
                    </button>
                  )}
                </div>
              </div>

              {/* Notification banner */}
              {notification && (
                <div style={{
                  padding: '10px 20px',
                  background: 'rgba(99,102,241,0.08)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontSize: 13, color: 'var(--primary)', fontWeight: 500,
                }}>
                  <i className="fa-solid fa-bell"></i>
                  {notification}
                </div>
              )}

              {/* Next-up banner */}
              {nextGarage && !notification && (
                <div style={{
                  padding: '8px 20px',
                  background: 'rgba(245,158,11,0.07)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontSize: 12, color: 'var(--warning)', fontWeight: 500,
                }}>
                  <i className="fa-solid fa-circle-info"></i>
                  If current garage is rejected, notification will be sent to <strong style={{ marginLeft: 4 }}>#{nextGarage.rank} {nextGarage.name}</strong>
                </div>
              )}

              {/* Garage ranked list */}
              <div style={{ padding: '20px 20px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 16 }}>
                  <i className="fa-solid fa-brain" style={{ marginRight: 6 }}></i>
                  AI Ranked Garage Queue — sorted by distance · rating · specialization · availability
                </div>
                {entry.garages.map((g, i) => (
                  <GarageRow key={g.id} g={g} isLast={i === entry.garages.length - 1} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
