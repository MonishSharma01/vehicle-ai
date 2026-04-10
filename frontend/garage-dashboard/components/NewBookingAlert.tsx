'use client';

import { NewBooking } from '@/types';
import { AlertCircle } from 'lucide-react';

interface NewBookingAlertProps {
  booking: NewBooking | null;
  onAccept: () => void;
  onReject: () => void;
}

export default function NewBookingAlert({ booking, onAccept, onReject }: NewBookingAlertProps) {
  if (!booking) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Car Image Placeholder */}
        <div className="bg-gray-200 rounded-lg h-40 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">🚗</div>
            <p className="text-sm">{booking.carModel}</p>
          </div>
        </div>

        {/* Booking Details */}
        <div className="space-y-3">
          <div className="inline-block bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-bold">
            {booking.actionLabel === 'START SERVICE' ? '🔧 USER CONFIRMED — START SERVICE' : 'NEW BOOKING JUST ARRIVED'}
          </div>
          <p className="text-sm text-gray-600">Issue ID: {booking.issueId}</p>
          <p className="text-lg font-semibold text-gray-900">{booking.carModel}</p>
          <p className="text-sm text-gray-600">Owner: {booking.owner}</p>
          <div className="pt-2 border-t border-gray-200">
            <p className="text-sm text-red-600 font-semibold">{booking.problem}</p>
            <p className="text-sm text-gray-600 mt-1">{booking.scheduledTime}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onAccept}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            ACCEPT
          </button>
          <button
            onClick={onReject}
            className="flex-1 border-2 border-red-600 text-red-600 hover:bg-red-50 font-semibold py-3 rounded-lg transition-colors"
          >
            REJECT
          </button>
        </div>
      </div>
    </div>
  );
}
