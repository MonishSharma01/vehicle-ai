'use client';

import { LiveJob } from '@/types';
import { CheckCircle2, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

interface LiveTrackingItemProps {
  job: LiveJob;
  onMarkCompleted: (jobId: string) => void;
  onSubmission: (jobId: string) => void;
}

export default function LiveTrackingItem({
  job,
  onMarkCompleted,
  onSubmission,
}: LiveTrackingItemProps) {
  const [timeLeft, setTimeLeft] = useState(job.timeLeft || 0);

  useEffect(() => {
    if (job.status !== 'IN_PROGRESS' || !job.timeLeft) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [job.status, job.timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1">
        {/* Status Indicator */}
        <div className="flex-shrink-0">
          {job.status === 'IN_PROGRESS' ? (
            <div className="relative w-4 h-4">
              <div className="absolute inset-0 bg-green-500 rounded-full animate-pulse"></div>
              <div className="absolute inset-1 bg-green-400 rounded-full"></div>
            </div>
          ) : (
            <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
          )}
        </div>

        {/* Job Info */}
        <div className="flex-1">
          <p className="text-sm text-gray-600">Car ID: {job.carId}</p>
          <p className="font-semibold text-gray-900">{job.serviceType}</p>
          <p className="text-xs text-gray-500 mt-1">
            {job.status === 'IN_PROGRESS'
              ? `${minutes}m ${seconds}s left`
              : `Scheduled: ${job.scheduledTime}`}
          </p>
        </div>

        {/* Status Badge */}
        <div>
          {job.status === 'IN_PROGRESS' ? (
            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              IN_PROGRESS
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
              SCHEDULED
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {job.status === 'IN_PROGRESS' && (
        <div className="flex gap-2">
          <button
            onClick={() => onMarkCompleted(job.id)}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Mark Completed
          </button>
          <button
            onClick={() => onSubmission(job.id)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Submission
          </button>
        </div>
      )}
    </div>
  );
}
