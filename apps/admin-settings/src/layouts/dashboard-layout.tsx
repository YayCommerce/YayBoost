/**
 * Dashboard Layout - Main layout for YayBoost admin
 * Uses tab-based navigation synced with React Router
 */

import { Gear, House, Lightning, Package } from '@phosphor-icons/react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { __ } from '@wordpress/i18n';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { HeaderNavMenuItem, HeaderNavMenuList } from '@/components/ui/navmenu-header';
import { Footer } from '@/components/layout/Footer';

const navigation = [
  { name: __('Dashboard', 'yayboost'), key: 'dashboard', path: '/', icon: House },
  { name: __('Features', 'yayboost'), key: 'features', path: '/features', icon: Lightning },
  { name: __('Settings', 'yayboost'), key: 'settings', path: '/settings', icon: Gear },
];

// Get current tab from location pathname
function getCurrentTab(pathname: string): string {
  if (pathname === '/settings') {
    return 'settings';
  }
  if (pathname === '/features' || pathname.startsWith('/features/')) {
    return 'features';
  }
  // Default to 'dashboard' for '/' (index route)
  return 'dashboard';
}

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentTab = getCurrentTab(location.pathname);

  const handleTabChange = (value: string) => {
    const menu = navigation.find((m) => m.key === value);
    if (menu) {
      navigate(menu.path);
    }
  };

  return (
    <div className="yayboost-admin bg-background min-h-screen">
      <TabsPrimitive.Root value={currentTab} onValueChange={handleTabChange}>
        {/* Header */}
        <header className="bg-card border-b">
          <div className="flex h-16 items-center justify-between px-6">
            {/* Logo */}
            <div className="flex items-center gap-3 pr-6">
              <div className="bg-primary text-primary-foreground flex h-9 w-9 items-center justify-center rounded-lg">
                <Package weight="duotone" className="h-5 w-5" />
              </div>
            </div>

            {/* Tab Navigation */}
            <TabsPrimitive.List asChild>
              <HeaderNavMenuList className="h-16 justify-start gap-0" activeValue={currentTab}>
                {navigation.map((item) => (
                  <TabsPrimitive.Trigger key={item.key} value={item.key} asChild>
                    <HeaderNavMenuItem className="flex min-w-[50px] items-center justify-center gap-2 px-2 py-3 sm:px-5">
                      <item.icon className="h-4 w-4" />
                      <span className="hidden sm:flex">{item.name}</span>
                    </HeaderNavMenuItem>
                  </TabsPrimitive.Trigger>
                ))}
              </HeaderNavMenuList>
            </TabsPrimitive.List>
          </div>
        </header>

        {/* Main content */}
        <main className="p-6">
          <Outlet />
        </main>
        <Footer />
      </TabsPrimitive.Root>
    </div>
  );
}
