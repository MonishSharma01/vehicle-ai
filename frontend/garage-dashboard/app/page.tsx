'use client';

import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import StatsCard from '@/components/StatsCard';
import NewBookingAlert from '@/components/NewBookingAlert';
import LiveServiceTrackingItem from '@/components/LiveServiceTrackingItem';
import SetChargesModal from '@/components/SetChargesModal';
import {
  TrendingUp,
  CheckCircle2,
  DollarSign,
  Star,
  MessageSquare,
  X,
} from 'lucide-react';
import {
  mockNewBooking,
  mockLiveJobs,
  defaultChargesConfig,
  defaultDashboardStats,
} from '@/lib/mockData';
import { DashboardStats, LiveJob, NewBooking, ChargesConfig } from '@/types';
import { formatCurrency } from '@/lib/utils';

export default function Dashboard() {
  const [stats, setStats] = useLocalStorage<DashboardStats>(
    'dashboardStats',
    defaultDashboardStats
  );
  const [liveJobs, setLiveJobs] = useLocalStorage<LiveJob[]>(
    'liveJobs',
    mockLiveJobs
  );
  const [newBooking, setNewBooking] = useLocalStorage<NewBooking | null>(
    'newBooking',
    mockNewBooking
  );
  const [chargesConfig, setChargesConfig] = useLocalStorage<ChargesConfig>(
    'chargesConfig',
    defaultChargesConfig
  );
  const [showChargesModal, setShowChargesModal] = useState(false);
  const [showInsight, setShowInsight] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: string = 'success') => {
    setToast({ message, type });
  };

  const handleAcceptBooking = () => {
    if (!newBooking) return;

    // Add to live jobs
    const newJob: LiveJob = {
      id: newBooking.id,
      carId: 'CAR-' + Date.now(),
      serviceType: newBooking.problem,
      status: 'IN_PROGRESS',
      timeLeft: 1200, // 20 minutes
      serviceCost: 800,
    };

    setLiveJobs([...(liveJobs || []), newJob]);
    setStats((prev) => ({
      ...prev,
      todaysBookings: prev.todaysBookings + 1,
    }));

    setNewBooking(null);
    showToast('Booking accepted! Added to live tracking');
  };

  const handleRejectBooking = () => {
    setNewBooking(null);
    showToast('Booking rejected', 'info');
  };

  const handleMarkCompleted = (jobId: string) => {
    const job = (liveJobs || []).find((j) => j.id === jobId);
    if (!job) return;

    setLiveJobs((liveJobs || []).filter((j) => j.id !== jobId));
    setStats((prev) => ({
      ...prev,
      completed: prev.completed + 1,
      revenue: prev.revenue + job.serviceCost,
    }));

    showToast('Service marked as completed!');
  };

  const handleSubmission = (jobId: string) => {
    showToast('Order submitted successfully!', 'info');
  };

  const handleSaveCharges = (charges: ChargesConfig) => {
    setChargesConfig(charges);
    showToast('Service charges updated!');
  };

  return (
    <div className="p-8 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Today's Bookings"
          value={stats.todaysBookings}
          icon={<TrendingUp size={24} />}
        />
        <StatsCard
          title="Completed"
          value={stats.completed}
          icon={<CheckCircle2 size={24} />}
        />
        <StatsCard
          title="Revenue"
          value={formatCurrency(stats.revenue)}
          icon={<DollarSign size={24} />}
        />
        <StatsCard
          title="Rating"
          value={stats.rating}
          suffix="⭐"
          icon={<Star size={24} />}
        />
      </div>

      {/* New Booking Alert */}
      {newBooking && (
        <NewBookingAlert
          booking={newBooking}
          onAccept={handleAcceptBooking}
          onReject={handleRejectBooking}
        />
      )}

      {/* Insights Banner */}
      {showInsight && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-blue-900">💡 Insight</h3>
            <p className="text-blue-800 text-sm mt-1">
              80% of your bookings are BATTERY issues → Stock more batteries!
            </p>
          </div>
          <button
            onClick={() => setShowInsight(false)}
            className="text-blue-600 hover:text-blue-800 p-1"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Live Service Tracking */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Live Service Tracking
        </h2>

        {!liveJobs || liveJobs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No active jobs at the moment</p>
        ) : (
          <div className="space-y-3">
            {liveJobs.map((job) => (
              <LiveServiceTrackingItem
                key={job.id}
                job={job}
                onMarkCompleted={handleMarkCompleted}
                onSubmission={handleSubmission}
              />
            ))}
          </div>
        )}
      </div>

      {/* Set My Charges Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowChargesModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Set My Charges
        </button>
      </div>

      {/* Set Charges Modal */}
      <SetChargesModal
        isOpen={showChargesModal}
        onClose={() => setShowChargesModal(false)}
        onSave={handleSaveCharges}
        initialCharges={chargesConfig}
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 bg-white rounded-lg shadow-lg p-4 flex items-center gap-3 toast ${toast.type}`}>
          {toast.type === 'success' && (
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
              ✓
            </div>
          )}
          {toast.type === 'info' && (
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
              ⓘ
            </div>
          )}
          <p className="text-gray-800 text-sm font-medium">{toast.message}</p>
        </div>
      )}
    </div>
  );
}
