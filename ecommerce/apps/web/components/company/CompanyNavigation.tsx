"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Logo } from "@/components/common/Logo";
import { useAuthStore } from "@/lib/store/useAuthStore";
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  FolderTree,
  Boxes,
  Star,
  ShoppingBag,
  Clock,
  RefreshCw,
  Truck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Users,
  MessageSquare,
  Ticket,
  Sparkles,
  UserCheck,
  TrendingUp,
  BarChart3,
  PieChart,
  Store,
  Settings,
  ShieldCheck,
  HelpCircle,
  ExternalLink,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/company/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Store Catalog",
    items: [
      { label: "Products", href: "/company/products", icon: Package },
      { label: "Categories", href: "/company/categories", icon: FolderTree },
      { label: "Inventory", href: "/company/inventory", icon: Boxes },
      { label: "Product Reviews", href: "/company/reviews", icon: Star },
    ],
  },
  {
    label: "Orders & Fulfillment",
    items: [
      { label: "All Orders", href: "/company/orders", icon: ShoppingBag },
      { label: "Pending", href: "/company/orders?status=pending", icon: Clock },
      { label: "Processing", href: "/company/orders?status=processing", icon: RefreshCw },
      { label: "Shipped", href: "/company/orders?status=shipped", icon: Truck },
      { label: "Delivered", href: "/company/orders?status=delivered", icon: CheckCircle2 },
      { label: "Cancelled", href: "/company/orders?status=cancelled", icon: XCircle },
    ],
  },
  {
    label: "Customers",
    items: [
      { label: "Customers", href: "/company/customers", icon: Users },
      { label: "Customer Reviews", href: "/company/reviews", icon: MessageSquare },
    ],
  },
  {
    label: "Marketing & Growth",
    items: [
      { label: "Coupons", href: "/company/coupons", icon: Ticket },
      { label: "Influencers", href: "/company/influencers", icon: UserCheck },
      { label: "Campaigns", href: "/company/campaigns", icon: Sparkles },
      { label: "Performance", href: "/company/analytics", icon: TrendingUp },
    ],
  },
  {
    label: "Analytics",
    items: [
      { label: "Sales Analytics", href: "/company/analytics", icon: BarChart3 },
      { label: "Product Analytics", href: "/company/analytics", icon: PieChart },
    ],
  },
  {
    label: "Company",
    items: [
      { label: "Store Profile", href: "/company/store", icon: Store },
      { label: "Settings", href: "/company/settings", icon: Settings },
      { label: "Team & Permissions", href: "/company/team", icon: ShieldCheck },
    ],
  },
];

interface CompanyNavigationProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const CompanyNavigation: React.FC<CompanyNavigationProps> = ({
  collapsed,
  onToggleCollapse,
}) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuthStore();

  const isActive = (href: string) => {
    if (href === "/company/dashboard") return pathname === "/company/dashboard";

    const [cleanHref, queryStr] = href.split("?");

    if (queryStr) {
      const targetParams = new URLSearchParams(queryStr);
      const targetStatus = targetParams.get("status");
      const currentStatus = searchParams.get("status");
      return pathname === cleanHref && currentStatus === targetStatus;
    }

    const currentStatus = searchParams.get("status");
    if (pathname === "/company/orders" && href === "/company/orders" && currentStatus) {
      return false;
    }

    return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
  };

  const storeName = user?.first_name ? `${user.first_name}'s Store` : "TechStore Official";

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 border-r border-slate-800 select-none">
      {/* Top Workspace Indicator Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
        <Link href="/company/dashboard" className="flex items-center gap-3 min-w-0">
          <Logo size={28} showText={!collapsed} textClassName="text-sm text-white" />
        </Link>
      </div>

      {/* Company Store Workspace Avatar */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/40 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">
            {storeName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-white truncate">{storeName}</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Verified Seller
            </span>
          </div>
        </div>
      )}

      {/* Main Navigation Menu */}
      <nav className="flex-1 overflow-y-auto admin-scrollbar px-2 py-3 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={`${group.label}-${item.label}`}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      collapsed ? "justify-center px-0" : ""
                    } ${
                      active
                        ? "bg-blue-600 text-white font-semibold shadow-sm"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Menu Items */}
      <div className="p-2 border-t border-slate-800 space-y-1 flex-shrink-0">
        {user?.role === "SUPER_ADMIN" && (
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-purple-400 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/50 transition-colors"
            title="Super Admin Portal"
          >
            <ShieldCheck className="w-4 h-4 shrink-0 text-purple-400" />
            {!collapsed && <span>Super Admin Portal</span>}
          </Link>
        )}
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="View Public Store"
        >
          <ExternalLink className="w-4 h-4 shrink-0 text-slate-400" />
          {!collapsed && <span>View Store</span>}
        </Link>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          {!collapsed && <span className="text-[11px]">Collapse sidebar</span>}
          {collapsed ? <ChevronsRight className="w-4 h-4 mx-auto" /> : <ChevronsLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
