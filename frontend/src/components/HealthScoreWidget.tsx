import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Badge } from './ui/Badge';
import { ProgressBar } from './ui/ProgressBar';
import { NetworkHealthData } from '../types';
import { ShieldCheck, Info } from 'lucide-react';

interface HealthScoreWidgetProps {
  data: NetworkHealthData;
}

export const HealthScoreWidget: React.FC<HealthScoreWidgetProps> = ({ data }) => {
  const { health_score, status, factors, active_anomalies } = data;

  const factorList = [
    {
      code: 'U',
      name: 'Capacity Headroom',
      weight: '30%',
      value: factors.capacity_headroom_u,
      description: '100 − utilization %',
      color: 'bg-emerald-500',
    },
    {
      code: 'L',
      name: 'Responsiveness',
      weight: '25%',
      value: factors.responsiveness_l,
      description: 'max(0, 100 − latency ms)',
      color: 'bg-blue-500',
    },
    {
      code: 'P',
      name: 'Packet Reliability',
      weight: '20%',
      value: factors.reliability_p,
      description: 'max(0, 100 − 20 × loss %)',
      color: 'bg-indigo-500',
    },
    {
      code: 'A',
      name: 'Network Stability',
      weight: '15%',
      value: factors.stability_a,
      description: `100 − 25 × active anomalies (${active_anomalies})`,
      color: 'bg-purple-500',
    },
    {
      code: 'C',
      name: 'Near-Term Risk Factor',
      weight: '10%',
      value: factors.near_term_risk_c,
      description: '100 − ML congestion prob %',
      color: 'bg-teal-500',
    },
  ];

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <CardTitle>Network Health Index</CardTitle>
          </div>
          <CardDescription>
            Weighted composite score evaluated across 5 explainable factors
          </CardDescription>
        </div>
        <Badge
          variant={
            status === 'EXCELLENT'
              ? 'success'
              : status === 'GOOD'
              ? 'info'
              : status === 'FAIR'
              ? 'warning'
              : 'destructive'
          }
          className="text-xs px-2.5 py-0.5"
        >
          {status}
        </Badge>
      </CardHeader>

      <CardContent>
        {/* Main Score Display */}
        <div className="flex items-center justify-between p-4 bg-muted/60 rounded-xl border border-border/80 mb-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Composite Index
            </div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-4xl font-extrabold font-mono tracking-tight text-foreground">
                {health_score}
              </span>
              <span className="text-sm font-medium text-muted-foreground">/ 100</span>
            </div>
          </div>

          <div className="text-right text-xs space-y-1">
            <div className="text-muted-foreground">Scale Benchmark:</div>
            <div className="font-mono text-[11px] text-slate-700">
              85-100: Excellent • 70-84: Good • 50-69: Fair • &lt;50: Poor
            </div>
          </div>
        </div>

        {/* 5 Explainable Factors Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Factor Breakdown</span>
            <span>Weight & Score</span>
          </div>

          {factorList.map((f) => (
            <div key={f.code} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5">
                  <span className="w-4 h-4 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-bold flex items-center justify-center border border-border">
                    {f.code}
                  </span>
                  <span className="font-medium text-foreground">{f.name}</span>
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    ({f.description})
                  </span>
                </div>
                <div className="flex items-center space-x-2 font-mono">
                  <span className="text-[11px] text-muted-foreground">[{f.weight}]</span>
                  <span className="font-bold text-foreground text-xs">{f.value}</span>
                </div>
              </div>
              <ProgressBar value={f.value} color={f.color} className="h-1.5" />
            </div>
          ))}
        </div>

        {/* Formula Box */}
        <div className="mt-4 pt-3 border-t border-border flex items-start space-x-2 text-[11px] text-muted-foreground">
          <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="font-mono text-[10px] leading-relaxed">
            Health = 0.30·U + 0.25·L + 0.20·P + 0.15·A + 0.10·C
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

