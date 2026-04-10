import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useAppContext } from '../store/data';

ChartJS.register(ArcElement, Tooltip, Legend);

export const Analytics = () => {
  const { anomalies, failureData } = useAppContext();

  const chartData = {
    labels: failureData.map(d => d.label),
    datasets: [{
      data: failureData.map(d => d.pct),
      backgroundColor: failureData.map(d => d.color),
      borderWidth: 2,
      borderColor: '#ffffff',
      hoverOffset: 6
    }]
  };

  const options = {
    cutout: '65%',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' as const, labels: { font: { family: 'Inter', size: 12 }, padding: 20 } },
      tooltip: { backgroundColor: '#111827', titleFont: { family: 'Inter', size: 13 }, bodyFont: { family: 'Inter', size: 13 }, padding: 12, cornerRadius: 8 }
    }
  };

  return (
    <div className="two-col">
      <section className="white-card animate-in">
        <div className="section-header">
          <h2><i className="fa-solid fa-lightbulb" style={{ color: 'var(--warning)' }}></i> AI Predictive Insights</h2>
        </div>
        
        <div className="chart-wrap" style={{ height: '260px', marginBottom: '24px' }}>
          <Doughnut data={chartData} options={options} />
        </div>
        
        <div className="insight-bars">
          {failureData.map((d, i) => (
            <div className="insight-bar-row" key={i}>
              <span className="insight-bar-label">{d.label}</span>
              <div className="insight-bar-track">
                <div className="insight-bar-fill" style={{ width: `${d.pct}%`, background: d.color }}></div>
              </div>
              <span className="insight-bar-pct">{d.pct}%</span>
            </div>
          ))}
        </div>
      </section>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <section className="white-card animate-in">
          <div className="section-header">
            <h2><i className="fa-solid fa-satellite-dish" style={{ color: 'var(--accent-purple)' }}></i> Live System Anomalies</h2>
          </div>
          <div className="anomaly-list">
            {anomalies.map((a, i) => (
              <div className="anomaly-item" key={i}>
                <div className={`anomaly-icon ${a.severity}`}>
                  <i className={`fa-solid ${a.severity==='critical'?'fa-bolt':a.severity==='warning'?'fa-exclamation':'fa-info'}`}></i>
                </div>
                <div className="anomaly-content">
                  <div className="anomaly-header">
                    {a.vehicle ? <span className="anomaly-vehicle" style={{ color: 'var(--primary)' }}>{a.vehicle}</span> : <span className="anomaly-vehicle" style={{ color: 'var(--text-muted)' }}>System Engine</span>}
                    <span className="anomaly-time">{a.time}</span>
                  </div>
                  <div className="anomaly-text">{a.issue}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
        
        <div className="insight-note alert animate-in">
          <strong><i className="fa-solid fa-circle-exclamation"></i> Quality Alert</strong>
          Supply chain analysis indicates a potential batch defect in standard 12V batteries originating from Supplier B. 45% of recent failures stem from this component.
        </div>
        <div className="insight-note positive animate-in">
          <strong><i className="fa-solid fa-chart-line"></i> Proactive Savings</strong>
          Predictive models have scheduled 47 early interventions for next week. Estimated prevention of catastrophic failures saves approximately ₹4,20,000.
        </div>
      </div>
    </div>
  );
};
