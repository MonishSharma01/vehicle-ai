'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wrench, ClipboardList, Users, HelpCircle, Settings } from 'lucide-react';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  divider?: boolean;
}

export default function Sidebar() {
  const pathname = usePathname();

  const mainMenuItems: MenuItem[] = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', href: '/' },
    { icon: <Wrench size={20} />, label: 'Services', href: '/services' },
    { icon: <ClipboardList size={20} />, label: 'Work Orders', href: '/work-orders' },
    { icon: <Users size={20} />, label: 'Customers', href: '/customers' },
  ];

  const bottomMenuItems: MenuItem[] = [
    { icon: <HelpCircle size={20} />, label: 'Support', href: '#' },
    { icon: <Settings size={20} />, label: 'Settings', href: '#' },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Precision Garage</h1>
      </div>

      {/* Main Menu */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {mainMenuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
              isActive(item.href)
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom Menu */}
      <div className="border-t border-gray-200 px-4 py-4 space-y-2">
        {bottomMenuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
