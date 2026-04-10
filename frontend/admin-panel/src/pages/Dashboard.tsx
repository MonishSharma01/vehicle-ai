import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../store/data';
import { api } from '../lib/api';

export const Dashboard = () => {
  const { vehicles, anomalies, accuracy, setAccuracy, addToast } = useAppContext();
  const navigate = useNavigate();

  const [retraining, setRetraining] = useState(false);
  const [diag, setDiag] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertText, setAlertText] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('info');
  const [simVehicle, setSimVehicle] = useState('V001');
  const [simIssue, setSimIssue] = useState('battery_failure');
  const [simulating, setSimulating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  const [logs, setLogs] = useState([
    { type: 'info',    text: '[INFO]    2026-04-10 13:00:01 - Core engine started.' },
    { type: 'info',    text: '[INFO]    2026-04-10 13:00:05 - Connection pool established (max: 50).' },
    { type: 'warning', text: '[WARN]    2026-04-10 13:05:12 - High latency detected on PredictionAgent-A.' },
    { type: 'info',    text: '[INFO]    2026-04-10 13:06:00 - Data synchronization complete.' },
    { type: 'error',   text: '[ERROR]   2026-04-10 08:45:00 - Pricing Agent failed to respond. Attempting restart.' },
    { type: 'info',    text: '[INFO]    2026-04-10 08:45:03 - Pricing Agent successfully restarted.' },
  ]);

  const h = new Date().getHours();
  const greeting = `Good ${h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'}, Admin`;

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, logsOpen]);

  const pushLog = (type: string, text: string) =>
    setLogs(curr => [...curr, { type, text }]);

  const handleRetrain = () => {
    setRetraining(true);
    addToast('Initiating model parameter optimization...', 'info');
    setTimeout(() => {
      setRetraining(false);
      setAccuracy(a => Number((a + 0.5).toFixed(1)));
      addToast('AI Model Retrained — Accuracy improved!', 'success');
      pushLog('success', `[SUCCESS] ${new Date().toLocaleTimeString()} - Synthetic data cycle complete. Weights updated.`);
    }, 2500);
  };

  const handleDiagnose = () => {
    setDiag(true);
    addToast('Diagnostics trace started. Pinging all microservices...', 'info');
    setTimeout(() => {
      setDiag(false);
      addToast('Diagnostics completed. All sub-agents are healthy.', 'success');
      pushLog('info', `[INFO]    ${new Date().toLocaleTimeString()} - Diagnostics Trace: Health 100%. Node A, Node B responsive.`);
    }, 3000);
  };

  const handleExport = () => {
    addToast('Platform dataset snapshot initiated...', 'info');
    setTimeout(() => addToast('Snapshot downloaded successfully to local machine.', 'success'), 1200);
  };

  const handleBroadcast = () => {
    if (!alertText.trim()) return addToast('Alert message cannot be blank.', 'error');
    setAlertOpen(false);
    addToast('Global Alert successfully broadcast to entire fleet network!', 'success');
    pushLog('info', `[INFO]    ${new Date().toLocaleTimeString()} - GLOBAL BROADCAST [${alertSeverity.toUpperCase()}]: "${alertText.substring(0, 30)}..."`);
    setAlertText('');
  };

  const handleForceIssue = async () => {
    setSimulating(true);
    try {
      await api.forceIssue(simVehicle, simIssue);
      addToast(`Force issue '${simIssue}' queued for ${simVehicle} on the next telemetry cycle.`, 'success');
      pushLog('info', `[INFO]    ${new Date().toLocaleTimeString()} - FORCE ISSUE: ${simVehicle} → ${simIssue}`);
    } catch {
      addToast('Could not reach backend. Is the server running?', 'error');
    } finally {
      setSimulating(false);
    }
  };

  const handleResetSystem = async () => {
    setResetting(true);
    try {
      await api.reset();
      addToast('System reset complete. All data cleared and re-seeded.', 'success');
      pushLog('info', `[INFO]    ${new Date().toLocaleTimeString()} - DB RESET: vehicles and garages re-seeded.`);
    } catch {
      addToast('Could not reach backend. Is the server running?', 'error');
    } finally {
      setResetting(false);
    }
  };

  const logClass = (type: string) => {
    if (type === 'error') return 'log-err';
    if (type === 'warning') return 'log-warn';
    if (type === 'success') return 'log-success';
    return '';
  };

  return (
    <>
      {/* WELCOME BANNER */}
      <div className="welcome-banner animate-in">
        <div>
          <h1>{greeting}</h1>
          <p className="welcome-sub">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="welcome-right">
          <div>See ALL vehicles, ALL garages, ALL AI activity</div>
          <div style={{ fontWeight: 600, color: 'var(--primary)', marginTop: '4px' }}>ADMIN COMPANY VIEW</div>
        </div>
      </div>

      {/* SYSTEM HEALTH METRICS */}
      <div className="section-header" style={{ marginTop: '8px' }}>
        <h2><i className="fa-solid fa-heart-pulse" style={{ color: 'var(--danger)' }}></i> System Health Metrics</h2>
      </div>

      <section className="stats-grid" style={{ marginTop: '-12px' }}>
        <div className="stat-card animate-in">
          <div className="stat-header"><div className="stat-icon"><i className="fa-solid fa-car-side"></i></div></div>
          <div className="stat-label">Total Active Vehicles</div>
          <div className="stat-value">{vehicles.length + 241}</div>
          <div className="stat-change up"><i className="fa-solid fa-arrow-trend-up"></i> Operational</div>
        </div>
        <div className="stat-card animate-in">
          <div className="stat-header"><div className="stat-icon"><i className="fa-solid fa-brain"></i></div></div>
          <div className="stat-label">AI Prediction Accuracy</div>
          <div className="stat-value">{accuracy}%</div>
          <div className="stat-change up"><i className="fa-solid fa-arrow-trend-up"></i> Optimal</div>
        </div>
        <div className="stat-card animate-in">
          <div className="stat-header"><div className="stat-icon"><i className="fa-solid fa-bolt"></i></div></div>
          <div className="stat-label">Avg Response Time</div>
          <div className="stat-value">2.3s</div>
          <div className="stat-change down"><i className="fa-solid fa-arrow-trend-down"></i> Excellent</div>
        </div>
        <div className="stat-card animate-in">
          <div className="stat-header"><div className="stat-icon"><i className="fa-solid fa-bug"></i></div></div>
          <div className="stat-label">Anomalies Detected Today</div>
          <div className="stat-value">{anomalies.length}</div>
          <div className="stat-change warn"><i className="fa-solid fa-triangle-exclamation"></i> Action required</div>
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="white-card animate-in">
        <div className="section-header" style={{ marginBottom: '20px' }}>
          <h2><i className="fa-solid fa-bolt" style={{ color: 'var(--success)' }}></i> Quick Actions</h2>
        </div>
        <div className="quick-actions">
          <button className="btn-quick btn-primary" onClick={() => navigate('/garages')}>
            <i className="fa-solid fa-house-medical"></i> Add New Garage
          </button>
          <button className="btn-quick" onClick={handleRetrain} disabled={retraining}>
            {retraining
              ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Processing...</>
              : <><i className="fa-solid fa-robot"></i> Retrain AI Model</>
            }
          </button>
          <button className="btn-quick" onClick={handleExport}>
            <i className="fa-solid fa-database"></i> Export All Data
          </button>
          <button className="btn-quick" onClick={() => setLogsOpen(true)}>
            <i className="fa-solid fa-terminal"></i> View System Logs
          </button>
          <button className="btn-quick" onClick={() => setAlertOpen(true)}>
            <i className="fa-solid fa-bullhorn"></i> Send Alert to All
          </button>
          <button className="btn-quick" onClick={handleDiagnose} disabled={diag}>
            {diag
              ? <><i className="fa-solid fa-spinner fa-spin"></i> Running...</>
              : <><i className="fa-solid fa-stethoscope"></i> Run Diagnostics</>
            }
          </button>
        </div>
      </section>

      {/* SYSTEM LOGS MODAL */}
      {logsOpen && (
        <div className="modal-overlay" onClick={() => setLogsOpen(false)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setLogsOpen(false)}>&times;</button>
            <h3>System Logs</h3>
            <p className="modal-sub">Live readout from AI microservices and Agents.</p>
            <div className="terminal-view" ref={terminalRef}>
              {logs.map((log, i) => (
                <div key={i} className={logClass(log.type)}>{log.text}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BROADCAST MODAL */}
      {alertOpen && (
        <div className="modal-overlay" onClick={() => setAlertOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setAlertOpen(false)}>&times;</button>
            <h3>Broadcast System Alert</h3>
            <p className="modal-sub">Send a push notification to all linked facility managers and vehicle screens.</p>
            <div className="form-group">
              <label>Alert Message</label>
              <textarea
                rows={4}
                className="form-control"
                value={alertText}
                onChange={e => setAlertText(e.target.value)}
                placeholder="System maintenance scheduled for tonight at 2AM EST..."
              />
            </div>
            <div className="form-group">
              <label>Severity Level</label>
              <select className="form-control" value={alertSeverity} onChange={e => setAlertSeverity(e.target.value)}>
                <option value="info">Informational</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setAlertOpen(false)}>Cancel</button>
              <button className="btn-confirm" onClick={handleBroadcast}>
                <i className="fa-solid fa-paper-plane"></i> Dispatch Global Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIMULATION CONTROLS */}
      <section className="white-card animate-in">
        <div className="section-header" style={{ marginBottom: '20px' }}>
          <h2><i className="fa-solid fa-flask" style={{ color: 'var(--accent-purple)' }}></i> Simulation &amp; Testing Controls</h2>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="filter-select" value={simVehicle} onChange={e => setSimVehicle(e.target.value)}>
            <option value="V001">V001</option>
            <option value="V002">V002</option>
            <option value="V003">V003</option>
          </select>
          <select className="filter-select" value={simIssue} onChange={e => setSimIssue(e.target.value)}>
            <option value="battery_failure">Battery Failure</option>
            <option value="engine_overheat">Engine Overheat</option>
            <option value="low_oil_life">Low Oil Life</option>
            <option value="normal">Normal</option>
          </select>
          <button className="btn-quick" onClick={handleForceIssue} disabled={simulating}>
            {simulating
              ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Triggering...</>
              : <><i className="fa-solid fa-bolt"></i> Force Issue</>
            }
          </button>
          <button
            className="btn-quick"
            style={{ background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' }}
            onClick={handleResetSystem}
            disabled={resetting}
          >
            {resetting
              ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Resetting...</>
              : <><i className="fa-solid fa-rotate-right"></i> Reset System</>
            }
          </button>
        </div>
        <p className="modal-sub" style={{ marginTop: '12px', marginBottom: 0 }}>
          Queue a vehicle defect for the next telemetry cycle, or wipe and re-seed the entire in-memory database.
        </p>
      </section>
    </>
  );
};
