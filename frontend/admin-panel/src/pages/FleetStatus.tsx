import { useState } from 'react';
import { useAppContext } from '../store/data';

export const FleetStatus = () => {
  const { vehicles, addToast } = useAppContext();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = vehicles.filter(v => {
    const matchSearch = v.id.toLowerCase().includes(search.toLowerCase()) || v.model.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || v.status === filter;
    return matchSearch && matchFilter;
  });

  const getHealthColor = (h: number) => h > 80 ? 'var(--success)' : h >= 50 ? 'var(--warning)' : 'var(--danger)';
  const getHealthIcon = (h: number) => h > 80 ? '✅' : h >= 50 ? '⚠️' : '🔴';

  const getStatusBadge = (s: string) => {
    if (!s || s === 'none') return <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>N/A</span>;
    if (s === 'pending') return <span className="badge badge-pending"><i className="fa-solid fa-clock"></i> Pending Reply</span>;
    if (s === 'accepted') return <span className="badge badge-accepted"><i className="fa-solid fa-check"></i> Accepted</span>;
    if (s === 'declined') return <span className="badge badge-suspended"><i className="fa-solid fa-xmark"></i> Declined</span>;
    return <span className={`badge badge-none`}>{s}</span>;
  };

  const refreshData = () => {
    addToast('Platform feed synced. No new status changes.', 'info');
  };

  return (
    <section className="white-card animate-in">
      <div className="section-header">
        <h2><i className="fa-solid fa-table-list" style={{ color: 'var(--primary)' }}></i> Fleet Status Overview</h2>
        <div className="toolbar">
          <div className="search-box">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input type="text" placeholder="Search ID or Vehicle…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All Conditions</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="healthy">Healthy</option>
          </select>
          <button className="btn-icon" title="Refresh Feed" onClick={refreshData}>
            <i className="fa-solid fa-arrows-rotate"></i>
          </button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Vehicle Make &amp; Model</th>
              <th>Health Score</th>
              <th>Predicted Failure</th>
              <th>Garage Status</th>
              <th>User Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(v => (
              <tr key={v.id}>
                <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{v.id.replace('CAR-', '')}</td>
                <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{v.model}</td>
                <td style={{ fontWeight: 700, color: getHealthColor(v.health) }}>
                  {v.health}% {getHealthIcon(v.health)}
                </td>
                <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{v.failure}</td>
                <td>{getStatusBadge(v.garageApproval)}</td>
                <td>{getStatusBadge(v.userApproval)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
