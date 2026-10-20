import React from 'react';
import { Wifi, ShieldCheck, RefreshCw, UserCheck, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NetworkHealthData } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  healthData?: NetworkHealthData;
  onOpenAuth: () => void;
  onRunPipeline: () => void;
  isPipelineRunning: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  healthData,
  onOpenAuth,
  onRunPipeline,
  isPipelineRunning,
}) => {
  const { user, isAuthenticated, logout, isAdmin } = useAuth();

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'analytics', label: 'Usage Analytics' },
    { id: 'peaks', label: 'Peak Detection' },
    { id: 'anomalies', label: 'Anomalies' },
    { id: 'clustering', label: 'Location Clusters' },
    { id: 'predictions', label: 'Congestion Prediction' },
    { id: 'heatmap', label: 'Campus Heatmap & 3D' },
    { id: 'recommendations', label: 'IT Recommendations' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-border shadow-subtle">
      {/* Top Brand Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white shadow-sm">
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight text-foreground leading-none">
                Campus Wi-Fi Intelligence
              </h1>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-slate-300">
                REC • PDS
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Data-Driven Usage, Peaks, Anomalies, Clustering & Congestion Prediction
            </p>
          </div>
        </div>

        {/* Right Status & Actions */}
        <div className="flex items-center space-x-3">
          {/* Health Score Pill */}
          {healthData && (
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-muted rounded-full border border-border text-xs">
              <ShieldCheck
                className={`w-4 h-4 ${
                  healthData.health_score >= 85
                    ? 'text-emerald-500'
                    : healthData.health_score >= 70
                    ? 'text-yellow-500'
                    : 'text-red-500'
                }`}
              />
              <span className="text-muted-foreground font-medium">Health:</span>
              <span className="font-bold text-foreground font-mono">{healthData.health_score}/100</span>
              <Badge
                variant={
                  healthData.status === 'EXCELLENT'
                    ? 'success'
                    : healthData.status === 'GOOD'
                    ? 'info'
                    : healthData.status === 'FAIR'
                    ? 'warning'
                    : 'destructive'
                }
                className="text-[10px] px-1.5 py-0"
              >
                {healthData.status}
              </Badge>
            </div>
          )}

          {/* Run Pipeline Button (Admin/Operator) */}
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRunPipeline}
              isLoading={isPipelineRunning}
              className="h-8 text-xs font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              <span>Run Pipeline</span>
            </Button>
          )}

          {/* User Auth Profile */}
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-2 pl-2 border-l border-border">
              <div className="hidden md:block text-right">
                <div className="text-xs font-semibold text-foreground leading-none">{user.full_name}</div>
                <div className="text-[10px] text-muted-foreground capitalize">{user.role.replace('_', ' ')}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={logout} title="Sign Out" className="h-8 w-8">
                <LogOut className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </Button>
            </div>
          ) : (
            <Button variant="default" size="sm" onClick={onOpenAuth} className="h-8 text-xs font-medium">
              <LogIn className="w-3.5 h-3.5 mr-1.5" />
              <span>Sign In</span>
            </Button>
          )}
        </div>
      </div>

      {/* Sub Navigation Bar */}
      <div className="border-t border-border/80 bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto py-1.5 scrollbar-none">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-white text-foreground shadow-sm font-semibold border border-border/80'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};

