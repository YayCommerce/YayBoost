/**
 * Dashboard Layout - Main layout for YayBoost admin
 * Uses tab-based navigation synced with React Router
 */

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { __ } from '@wordpress/i18n';
import { BookIcon, HeadsetIcon, HouseIcon, PackageIcon, Rocket, SettingsIcon } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { HeaderNavMenuItem, HeaderNavMenuList } from '@/components/ui/navmenu-header';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navigation = [
  { name: __('Dashboard', 'yayboost'), key: 'dashboard', path: '/', icon: HouseIcon },
  { name: __('Features', 'yayboost'), key: 'features', path: '/features', icon: PackageIcon },
  { name: __('Settings', 'yayboost'), key: 'settings', path: '/settings', icon: SettingsIcon },
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
    <div className="yayboost-admin min-h-screen">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="bg-background relative flex h-[54px] items-center gap-2 pr-2.5 sm:gap-5 sm:pr-6">
          {/* Logo */}
          <div className="border-input hidden h-full items-center bg-[#FFF5DB] px-[3px] pt-[3px] sm:flex">
            {/* <img
              className="h-[30px] w-[30px] sm:h-[50px] sm:w-[50px]"
              src={getImageUrl('yayrev-logo.png')}
              alt="YayReviews Logo"
            /> */}
            <div className='flex items-center justify-center w-[50px]'>
              <Rocket className="h-6 w-6" />
            </div>
          </div>

          {/* Tab Navigation */}
          <TabsPrimitive.Root value={currentTab} onValueChange={(value) => handleTabChange(value)}>
            <TabsPrimitive.List asChild>
              <HeaderNavMenuList className="h-[54px] justify-start gap-0" activeValue={currentTab}>
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
          </TabsPrimitive.Root>
          <div className="absolute top-[calc(100%+10px)] right-2 ml-auto flex items-center gap-2 sm:relative sm:top-0 sm:right-0 sm:gap-5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => window.open('https://yaycommerce.com/support/', '_blank')}
                >
                  <HeadsetIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Chat Support</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => window.open('https://docs.yaycommerce.com/yayreviews', '_blank')}
                >
                  <BookIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Documentation</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="p-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
