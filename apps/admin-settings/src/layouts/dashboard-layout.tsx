/**
 * Dashboard Layout - Main layout for YayBoost admin
 */

import { Gear, Lightning, Package } from '@phosphor-icons/react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Features', href: '/features', icon: Lightning },
  { name: 'Settings', href: '/settings', icon: Gear },
];

export function DashboardLayout() {
  const location = useLocation();

  return (
    <div className="yayboost-admin min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Package weight="duotone" className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">YayBoost</h1>
              <p className="text-xs text-muted-foreground">Boost your sales</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navigation.map((item) => {
              const isActive =
                item.href === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
