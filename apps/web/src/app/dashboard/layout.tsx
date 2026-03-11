'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  Settings,
  Tag,
  BarChart3,
  Star,
  Wallet,
  Truck,
  MessageSquare,
  ChevronLeft,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/products', label: 'Products', icon: ShoppingBag },
  { href: '/dashboard/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/dashboard/coupons', label: 'Coupons', icon: Tag },
  { href: '/dashboard/reviews', label: 'Reviews', icon: Star },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/withdraw', label: 'Withdraw', icon: Wallet },
  { href: '/dashboard/shipping', label: 'Shipping', icon: Truck },
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-24">
              <Link
                href="/"
                className="flex items-center gap-1.5 text-xs text-primary/50 hover:text-primary mb-4 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back to site
              </Link>
              <nav className="bg-white rounded-xl border border-light p-2 space-y-0.5">
                {NAV_ITEMS.map((item) => {
                  const isActive =
                    item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-accent/10 text-accent'
                          : 'text-primary/60 hover:text-primary hover:bg-light'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Mobile nav */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-light z-40 px-2 py-1.5 flex overflow-x-auto gap-1">
            {NAV_ITEMS.slice(0, 6).map((item) => {
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-[10px] min-w-[60px] transition-colors ${
                    isActive
                      ? 'text-accent'
                      : 'text-primary/40'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/dashboard/settings"
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-[10px] min-w-[60px] transition-colors ${
                pathname.startsWith('/dashboard/settings')
                  ? 'text-accent'
                  : 'text-primary/40'
              }`}
            >
              <Settings className="w-4 h-4" />
              More
            </Link>
          </div>

          {/* Main content */}
          <main className="flex-1 min-w-0 lg:pb-0 pb-16">{children}</main>
        </div>
      </div>
    </div>
  );
}
