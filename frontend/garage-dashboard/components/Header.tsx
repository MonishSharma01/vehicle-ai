'use client';

import { Bell, Settings, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logout, getGarageProfile } from '@/lib/auth';
import { useEffect, useState } from 'react';

export default function Header() {
  const router = useRouter();
  const [garageName, setGarageName] = useState('Garage Owner');
  const [initials, setInitials] = useState('RS');

  useEffect(() => {
    const profile = getGarageProfile();
    if (profile && profile.owner_name) {
      setGarageName(profile.owner_name);
      const parts = profile.owner_name.split(' ');
      if (parts.length > 1) {
        setInitials((parts[0][0] + parts[1][0]).toUpperCase());
      } else {
        setInitials(parts[0].slice(0, 2).toUpperCase());
      }
    }
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-gray-700">
          Welcome, <span className="font-semibold">{garageName}</span>
        </h1>

        <div className="flex items-center gap-6">
          {/* Notifications */}
          <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell size={20} />
            <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
          </button>

          {/* Settings */}
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings size={20} />
          </button>

          {/* Profile Avatar */}
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
            {initials}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <LogOut size={20} />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
