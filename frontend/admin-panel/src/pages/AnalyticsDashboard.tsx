/**
 * Admin Analytics Dashboard — 4 Chart.js charts powered by backend endpoints.
 * 
 * Charts:
 *  1. Errors Over Time (line chart)
 *  2. Car Model Error Frequency (bar chart)
 *  3. Error Type Distribution (doughnut)
 *  4. Garage Acceptance Rate (horizontal bar)
 */

import { useEffect, useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

const API = 'http://localhost:8000';

const CHART_FONT = { family: 'Inter', size: 12 };
const TOOLTIP_OPTS = {
  backgroundColor: '#0f172a',
  titleFont: CHART_FONT,
  bodyFont: CHART_FONT,
  padding: 12,
  cornerRadius: 8,
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface ErrorTimePoint   { time: string; count: number; }
interface CarModelFreq     { car_model: string; count: number; }
interface ErrorDist        { issue_type: string; label: string; count: number; color: string; pct: number; }
interface GaragePerf       { garage_id: string; garage_name: string; accepted: number; rejected: number; completed: number; total: number; acceptance_rate: number; rating: number; }

export const AnalyticsDashboard = () => {
  const [errorsOverTime, setErrorsOverTime]     = useState<ErrorTimePoint[]>([]);
  const [carFreq, setCarFreq]                   = useState<CarModelFreq[]>([]);
  const [distribution, setDistribution]         = useState<ErrorDist[]>([]);
  const [garagePerf, setGaragePerf]             = useState<GaragePerf[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [lastUpdated, setLastUpdated]           = useState('');

  const load = useCallback(async () => {
    try {
      const [t, c, d, g] = await Promise.all([
        fetch(`${API}/admin/analytics/errors-over-time`).then(r => r.json()),
        fetch(`${API}/admin/analytics/car-model-frequency`).then(r => r.json()),
        fetch(`${API}/admin/analytics/error-distribution`).then(r => r.json()),
        fetch(`${API}/admin/analytics/garage-performance`).then(r => r.json()),
      ]);
      setErrorsOverTime(t);
      setCarFreq(c);
      setDistribution(d);
      setGaragePerf(g);
      setLastUpdated(new Date().toLocaleTimeString('en-IN'));
    } catch (e) {
      /* backend not reachable */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [load]);

  // ── Chart data builders ──────────────────────────────────────────────────

  const lineData = {
    labels: errorsOverTime.map(p => p.time),
    datasets: [{
      label: 'Detected Issues',
      data: errorsOverTime.map(p => p.count),
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.12)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#6366f1',
      pointRadius: 4,
    }],
  };

  const barData = {
    labels: carFreq.map(c => c.car_model),
    datasets: [{
      label: 'Errors',
      data: carFreq.map(c => c.count),
      backgroundColor: carFreq.map((_, i) => [
        '#6366f1','#f59e0b','#ef4444','#10b981','#3b82f6','#8b5cf6','#ec4899',
      ][i % 7]),
      borderRadius: 6,
    }],
  };

  const doughnutData = {
    labels: distribution.map(d => d.label),
    datasets: [{
      data: distribution.map(d => d.count),
      backgroundColor: distribution.map(d => d.color),
      borderWidth: 2,
      borderColor: '#ffffff',
      hoverOffset: 6,
    }],
  };

  const garageBarData = {
    labels: garagePerf.map(g => g.garage_name),
    datasets: [
      {
        label: 'Accepted',
        data: garagePerf.map(g => g.accepted),
        backgroundColor: '#10b981',
        borderRadius: 4,
      },
      {
        label: 'Rejected',
        data: garagePerf.map(g => g.rejected),
        backgroundColor: '#ef4444',
        borderRadius: 4,
      },
    ],
  };

  const lineOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: TOOLTIP_OPTS,
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: CHART_FONT } },
      y: { grid: { color: '#f1f5f9' }, ticks: { font: CHART_FONT }, beginAtZero: true },
    },
  };

  const barOpts = {
    ...lineOpts,
    plugins: {
      legend: { display: false },
      tooltip: TOOLTIP_OPTS,
    },
  };

  const doughnutOpts = {
    cutout: '68%',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' as const, labels: { font: CHART_FONT, padding: 16 } },
      tooltip: TOOLTIP_OPTS,
    },
  };

  const garageBarOpts = {
    ...lineOpts,
    indexAxis: 'y' as const,
    plugins: {
      legend: { labels: { font: CHART_FONT } },
      tooltip: TOOLTIP_OPTS,
    },
  };

  const totalIssues = distribution.reduce((s, d) => s + d.count, 0);

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            <i className="fa-solid fa-chart-line" style={{ color: 'var(--primary)', marginRight: '10px' }}></i>
            Analytics Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Real-time ML detection insights · Refreshes every 10s
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {loading ? (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading…</span>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Updated {lastUpdated}
            </span>
          )}
          <span className="status-badge ok">
            <span className="dot"></span> Live
          </span>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[
          { label: 'Total Issues', value: totalIssues, color: '#6366f1', icon: 'fa-triangle-exclamation' },
          { label: 'Garages Tracked', value: garagePerf.length, color: '#10b981', icon: 'fa-warehouse' },
          { label: 'Car Models', value: carFreq.length, color: '#f59e0b', icon: 'fa-car' },
          { label: 'Detection Points', value: errorsOverTime.reduce((s, p) => s + p.count, 0), color: '#ef4444', icon: 'fa-bolt' },
        ].map((kpi, i) => (
          <div key={i} className="white-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '12px',
              background: kpi.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className={`fa-solid ${kpi.icon}`} style={{ color: kpi.color, fontSize: '18px' }}></i>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Row 1: Line + Doughnut */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <section className="white-card animate-in">
          <div className="section-header">
            <h2><i className="fa-solid fa-chart-line" style={{ color: '#6366f1' }}></i> Errors Over Time</h2>
          </div>
          <div style={{ height: '260px' }}>
            {errorsOverTime.length === 0 ? (
              <EmptyChart msg="No error data yet — ML detections will appear here" />
            ) : (
              <Line data={lineData} options={lineOpts} />
            )}
          </div>
        </section>

        <section className="white-card animate-in">
          <div className="section-header">
            <h2><i className="fa-solid fa-chart-pie" style={{ color: '#f59e0b' }}></i> Error Distribution</h2>
          </div>
          <div style={{ height: '260px' }}>
            {distribution.length === 0 ? (
              <EmptyChart msg="No issues detected yet" />
            ) : (
              <Doughnut data={doughnutData} options={doughnutOpts} />
            )}
          </div>
        </section>
      </div>

      {/* Row 2: Bar + Garage */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <section className="white-card animate-in">
          <div className="section-header">
            <h2><i className="fa-solid fa-car" style={{ color: '#10b981' }}></i> Car Model Error Frequency</h2>
          </div>
          <div style={{ height: '260px' }}>
            {carFreq.length === 0 ? (
              <EmptyChart msg="No car model data yet" />
            ) : (
              <Bar data={barData} options={barOpts} />
            )}
          </div>
        </section>

        <section className="white-card animate-in">
          <div className="section-header">
            <h2><i className="fa-solid fa-warehouse" style={{ color: '#ef4444' }}></i> Garage Acceptance Rate</h2>
          </div>
          <div style={{ height: '260px' }}>
            {garagePerf.length === 0 ? (
              <EmptyChart msg="No garage booking data yet" />
            ) : (
              <Bar data={garageBarData} options={garageBarOpts} />
            )}
          </div>
        </section>
      </div>

      {/* Garage performance table */}
      {garagePerf.length > 0 && (
        <section className="white-card animate-in">
          <div className="section-header">
            <h2><i className="fa-solid fa-table" style={{ color: '#8b5cf6' }}></i> Garage Performance Breakdown</h2>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {['Garage', 'Accepted', 'Rejected', 'Completed', 'Acceptance Rate', 'Rating'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {garagePerf.map(g => (
                <tr key={g.garage_id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px' }}><strong>{g.garage_name}</strong></td>
                  <td style={{ padding: '12px', color: '#10b981', fontWeight: 600 }}>{g.accepted}</td>
                  <td style={{ padding: '12px', color: '#ef4444', fontWeight: 600 }}>{g.rejected}</td>
                  <td style={{ padding: '12px' }}>{g.completed ?? '-'}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${g.acceptance_rate}%`, height: '100%', background: '#6366f1', borderRadius: '3px' }}></div>
                      </div>
                      <span style={{ fontWeight: 600, minWidth: '40px' }}>{g.acceptance_rate}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>⭐ {g.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
};

const EmptyChart = ({ msg }: { msg: string }) => (
  <div style={{
    height: '100%', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '8px',
    color: 'var(--text-muted)', fontSize: '13px',
  }}>
    <i className="fa-solid fa-chart-simple" style={{ fontSize: '28px', opacity: 0.3 }}></i>
    <span>{msg}</span>
  </div>
);
