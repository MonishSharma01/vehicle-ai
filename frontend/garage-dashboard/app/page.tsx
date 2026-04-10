'use client';

import { useState, useEffect, useCallback } from 'react';
import StatsCard from '@/components/StatsCard';
import NewBookingAlert from '@/components/NewBookingAlert';
import LiveServiceTrackingItem from '@/components/LiveServiceTrackingItem';
import {
  TrendingUp,
  CheckCircle2,
  DollarSign,
  Star,
} from 'lucide-react';
import { DashboardStats, LiveJob, NewBooking } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  getGarageStats,
  getGarageBookings,
  getPendingBooking,
  startBooking,
  completeBooking,
  cancelBooking,
} from '@/lib/api';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    todaysBookings: 0,
    completed: 0,
    revenue: 0,
    rating: 0,
  });
  const [liveJobs, setLiveJobs] = useState<LiveJob[]>([]);
  const [newBooking, setNewBooking] = useState<NewBooking | null>(null);
  const [showInsight] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [apiStats, apiBookings, apiPending] = await Promise.all([
        getGarageStats(),
        getGarageBookings(),
        getPendingBooking(),
      ]);

      setStats({
        todaysBookings: apiStats.todays_bookings,
        completed: apiStats.completed,
        revenue: apiStats.revenue,
        rating: apiStats.rating,
      });

      const jobs: LiveJob[] = apiBookings
        .filter((b) => b.status === 'IN_PROGRESS')
        .map((b) => ({
          id: b.id,
          carId: b.model,
          serviceType: b.service,
          status: 'IN_PROGRESS',
          timeLeft: 1200,
          serviceCost: b.cost_inr,
        }));
      setLiveJobs(jobs);

      if (apiPending) {
        setNewBooking({
          id: apiPending.id,
          issueId: apiPending.vehicle_id,
          carModel: apiPending.model,
          owner: apiPending.owner_name,
          problem: apiPending.issue.replace(/_/g, ' ').toUpperCase(),
          scheduledTime:
            'Today, ' +
            new Date(apiPending.created_at).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          actionLabel: apiPending.action_label,
        });
      } else {
        setNewBooking(null);
      }
    } catch {
      // Backend not reachable — keep current state
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: string = 'success') => {
    setToast({ message, type });
  };

  const handleAcceptBooking = async () => {
    if (!newBooking) return;
    await startBooking(newBooking.id);
    showToast('Booking accepted! Added to live tracking');
    fetchData();
  };

  const handleRejectBooking = async () => {
    if (!newBooking) return;
    await cancelBooking(newBooking.id);
    showToast('Booking rejected', 'info');
    fetchData();
  };

  const handleMarkCompleted = async (jobId: string) => {
    await completeBooking(jobId);
    showToast('Service marked as completed!');
    fetchData();
  };

  const handleSubmission = () => {
    showToast('Order submitted successfully!', 'info');
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
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-900">💡 Insight</h3>
          <p className="text-blue-800 text-sm mt-1">
            80% of your bookings are BATTERY issues → Stock more batteries!
          </p>
        </div>
      )}

      {/* Live Service Tracking */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Live Service Tracking
        </h2>

        {liveJobs.length === 0 ? (
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
