import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAppContext } from '../store/data';

export const Layout = () => {
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));
  const { toasts } = useAppContext();

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const navCls = ({ isActive }: { isActive: boolean }) =>
    'nav-link' + (isActive ? ' active' : '');

  const toastIcon = (type: string) => {
    if (type === 'info') return 'fa-info-circle';
    if (type === 'warning') return 'fa-triangle-exclamation';
    if (type === 'error') return 'fa-circle-xmark';
    return 'fa-check-circle';
  };

  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <i className="fa-solid fa-cube"></i>
          <span>AgenticAdmin</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={navCls}>
            <i className="fa-solid fa-house"></i>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/vehicles" className={navCls}>
            <i className="fa-solid fa-car"></i>
            <span>Fleet Status</span>
          </NavLink>
          <NavLink to="/garages" className={navCls}>
            <i className="fa-solid fa-warehouse"></i>
            <span>Garages</span>
          </NavLink>
          <NavLink to="/analytics" className={navCls}>
            <i className="fa-solid fa-chart-pie"></i>
            <span>AI Analytics</span>
          </NavLink>
          <NavLink to="/analytics-dashboard" className={navCls}>
            <i className="fa-solid fa-chart-line"></i>
            <span>Live Dashboard</span>
          </NavLink>
          <NavLink to="/garage-routing" className={navCls}>
            <i className="fa-solid fa-route"></i>
            <span>AI Routing</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">v4.0.0 — React Edition</div>
      </aside>

      {/* TOP BAR */}
      <header className="topbar">
        <div className="topbar-clock">{time}</div>
        <div className="topbar-status">
          <span className="dot"></span>
          All Systems Operational
        </div>
        <div className="topbar-avatar" title="Admin Profile">A</div>
      </header>

      {/* MAIN VIEW */}
      <main className="main">
        <Outlet />
      </main>

      {/* GLOBAL TOASTS */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <i className={`fa-solid ${toastIcon(t.type)}`}></i>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
