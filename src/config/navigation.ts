import { 
  LayoutDashboard, 
  Package, 
  Map as MapIcon, 
  Settings as SettingsIcon,
  Activity, 
  User 
} from 'lucide-react';

export const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/orders', icon: Package, label: 'Orders' },
  { path: '/optimization', icon: MapIcon, label: 'Optimization' },
  { path: '/monitor', icon: Activity, label: 'Monitor' },
  { path: '/settings', icon: SettingsIcon, label: 'Configuration' },
  { path: '/profile', icon: User, label: 'Profile' }
];
