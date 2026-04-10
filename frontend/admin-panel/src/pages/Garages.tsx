import { useState } from 'react';
import { useAppContext } from '../store/data';

export const Garages = () => {
  const { garages, setGarages, addToast } = useAppContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [gName, setGName] = useState('');
  const [gStatus, setGStatus] = useState('active');

  const handleAdd = () => {
    if (!gName.trim()) {
      return addToast('Please enter a facility name.', 'error');
    }
    setGarages(curr => [{ name: gName, bookings: 0, revenue: 0, rating: 5.0, status: gStatus }, ...curr]);
    setModalOpen(false);
    addToast(`${gName} onboarded to partner network successfully!`, 'success');
  };

  const openModal = () => {
    setGName('');
    setGStatus('active');
    setModalOpen(true);
  };

  return (
    <>
      <section className="white-card animate-in">
        <div className="section-header">
          <h2><i className="fa-solid fa-warehouse" style={{ color: 'var(--accent-teal)' }}></i> Partner Garages</h2>
          <div className="toolbar">
            <button className="btn-quick btn-primary" onClick={openModal}>
              <i className="fa-solid fa-plus"></i> Onboard New Garage
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Garage Partner</th>
                <th>AI Dispatched Jobs</th>
                <th>Gross Revenue</th>
                <th>Satisfaction Rating</th>
                <th>Network Status</th>
              </tr>
            </thead>
            <tbody>
              {garages.map((g, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{g.name}</td>
                  <td><i className="fa-solid fa-wrench" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}></i> {g.bookings}</td>
                  <td style={{ fontWeight: 500, color: 'var(--success)' }}>₹{g.revenue.toLocaleString('en-IN')}</td>
                  <td><strong>{g.rating.toFixed(1)}</strong> <i className="fa-solid fa-star" style={{ color: 'var(--warning)', fontSize: '.8rem' }}></i></td>
                  <td><span className={`badge badge-${g.status}`}>{g.status.replace('-', ' ').toUpperCase()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div className="modal-overlay show">
          <div className="modal">
            <button className="modal-close" onClick={() => setModalOpen(false)}>&times;</button>
            <h3>Onboard New Garage</h3>
            <p className="modal-sub">Register a new partner facility to the platform.</p>
            
            <div className="form-group">
              <label>Facility Name</label>
              <input type="text" className="form-control" placeholder="e.g., Downtown Auto Works" value={gName} onChange={e => setGName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Initial Status</label>
              <select className="form-control" value={gStatus} onChange={e => setGStatus(e.target.value)}>
                <option value="active">Active (Ready)</option>
                <option value="warning-status">Onboarding (Review)</option>
              </select>
            </div>
            
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn-confirm" onClick={handleAdd}>Add Garage</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
