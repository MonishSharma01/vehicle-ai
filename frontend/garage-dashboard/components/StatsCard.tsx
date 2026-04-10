
import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  suffix?: string;
}

export default function StatsCard({ title, value, icon, suffix }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-600 text-sm uppercase tracking-wider">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 mt-2">
            {value}
            {suffix && <span className="text-xl ml-1">{suffix}</span>}
          </h3>
        </div>
        <div className="text-blue-600">{icon}</div>
      </div>
    </div>
  );
}
