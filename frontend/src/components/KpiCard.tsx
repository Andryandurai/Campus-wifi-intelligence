import React from 'react';
import { Card, CardContent } from './ui/Card';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  trend?: string;
  trendPositive?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  badge,
  trend,
  trendPositive,
}) => {
  return (
    <Card className="hover:border-slate-300 transition-all duration-200">
      <CardContent className="p-4 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground tracking-tight">{title}</span>
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-slate-700">
            {icon}
          </div>
        </div>

        <div className="mt-2 flex items-baseline justify-between">
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">{value}</div>
          {badge}
        </div>

        {(subtitle || trend) && (
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{subtitle}</span>
            {trend && (
              <span
                className={`font-medium ${
                  trendPositive ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {trend}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

