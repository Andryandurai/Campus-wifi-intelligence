import React from 'react';
import { KpiData, NetworkHealthData, CampusBlock3D, CongestionPredictionItem, RecommendationItem, AnomalyItem } from '../types';
import { KpiCard } from '../components/KpiCard';
import { HealthScoreWidget } from '../components/HealthScoreWidget';
import { ThreeCampusViewer } from '../components/ThreeCampusViewer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Users, Activity, Clock, AlertTriangle, ArrowUpRight, ShieldAlert, Sparkles, Server } from 'lucide-react';

interface OverviewPageProps {
  kpis: KpiData;
  health: NetworkHealthData;
  blocks: CampusBlock3D[];
  predictions: CongestionPredictionItem[];
  recommendations: RecommendationItem[];
  anomalies: AnomalyItem[];
  onNavigateTab: (tabId: string) => void;
  onSelectBlock: (code: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  kpis,
  health,
  blocks,
  predictions,
  recommendations,
  anomalies,
  onNavigateTab,
  onSelectBlock,
}) => {
  const highRiskPredictions = predictions.filter((p) => p.risk_level === 'HIGH');
  const criticalAnomalies = anomalies.filter((a) => a.severity === 'Critical');

  return (
    <div className="space-y-6">
      {/* Top Banner Alert if any High-Risk Congestion or Critical Anomaly */}
      {highRiskPredictions.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900">
                Imminent Congestion Alert: {highRiskPredictions[0].location}
              </div>
              <div className="text-[11px] text-amber-700">
                ML model projects {highRiskPredictions[0].prob_random_forest}% congestion probability during window {highRiskPredictions[0].expected_window}.
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateTab('predictions')}
            className="text-xs border-amber-300 text-amber-900 bg-white hover:bg-amber-100/50"
          >
            <span>View Forecast</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <KpiCard
          title="Active Devices"
          value={kpis.total_active_devices?.toLocaleString() || '0'}
          subtitle={`${kpis.active_ap_count || 29} APs active`}
          icon={<Users className="w-4 h-4" />}
          badge={<Badge variant="outline" className="text-[10px] font-mono">Live</Badge>}
        />
        <KpiCard
          title="Avg Utilization"
          value={`${kpis.avg_utilization || 0}%`}
          subtitle={`Peak: ${kpis.peak_util_24h || 0}% (24h)`}
          icon={<Activity className="w-4 h-4" />}
          badge={
            <Badge variant={kpis.avg_utilization >= 70 ? 'warning' : 'success'} className="text-[10px]">
              {kpis.avg_utilization >= 70 ? 'Heavy' : 'Stable'}
            </Badge>
          }
        />
        <KpiCard
          title="Avg Latency"
          value={`${kpis.avg_latency_ms || 0} ms`}
          subtitle="Target < 50ms"
          icon={<Clock className="w-4 h-4" />}
          badge={<Badge variant={kpis.avg_latency_ms > 60 ? 'warning' : 'outline'} className="text-[10px] font-mono">RTT</Badge>}
        />
        <KpiCard
          title="Packet Loss"
          value={`${kpis.avg_packet_loss_pct || 0}%`}
          subtitle="Target < 1.0%"
          icon={<Server className="w-4 h-4" />}
          badge={<Badge variant={kpis.avg_packet_loss_pct > 1.5 ? 'destructive' : 'outline'} className="text-[10px] font-mono">Loss</Badge>}
        />
        <KpiCard
          title="24h Download"
          value={`${kpis.traffic_download_24h_gb || 0} GB`}
          subtitle="Aggregate DL traffic"
          icon={<ArrowUpRight className="w-4 h-4" />}
        />
        <KpiCard
          title="24h Upload"
          value={`${kpis.traffic_upload_24h_gb || 0} GB`}
          subtitle="Aggregate UL traffic"
          icon={<ArrowUpRight className="w-4 h-4 rotate-180" />}
        />
      </div>

      {/* Main Row: 3D Campus Twin & Health Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Campus Digital Twin Viewer (2 Cols) */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground tracking-tight">3D Campus Spatial Digital Twin</h2>
              <p className="text-xs text-muted-foreground">Interactive Three.js building geometry with live telemetry status and pulsing Wi-Fi AP signals</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab('heatmap')} className="text-xs">
              <span>Full Spatial Map</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
          <ThreeCampusViewer blocks={blocks} onSelectBlock={onSelectBlock} height="480px" />
        </div>

        {/* Network Health Score Factor Breakdown (1 Col) */}
        <div className="space-y-4">
          <HealthScoreWidget data={health} />

          {/* Quick IT Recommendations Card */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                  Priority IT Actions
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  {recommendations.length} Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0">
              {recommendations.slice(0, 3).map((rec) => (
                <div key={rec.id} className="p-2.5 rounded-lg bg-muted/60 border border-border/80 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-foreground text-xs">{rec.location}</span>
                    <Badge variant={rec.priority === 'High' ? 'destructive' : 'warning'} className="text-[10px]">
                      {rec.priority}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground text-[11px] line-clamp-2">{rec.description}</div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab('recommendations')}
                className="w-full text-xs mt-2"
              >
                View All Recommendations →
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Row: Recent Anomalies & Peak Windows Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Anomalies Preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm">Recent Telemetry Anomalies</CardTitle>
              <CardDescription>Flagged by 3-method ensemble: Z-Score, IQR & Isolation Forest</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab('anomalies')} className="text-xs">
              View Log →
            </Button>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-2">
              {anomalies.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-foreground font-mono">{a.access_point}</span>
                      <span className="text-muted-foreground">in {a.location}</span>
                      <Badge
                        variant={
                          a.severity === 'Critical'
                            ? 'destructive'
                            : a.severity === 'High'
                            ? 'warning'
                            : 'secondary'
                        }
                        className="text-[10px] px-1.5 py-0"
                      >
                        {a.severity}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{a.details}</div>
                  </div>
                  <div className="text-right text-[11px] font-mono text-muted-foreground whitespace-nowrap pl-2">
                    {a.timestamp.split(' ')[1] || a.timestamp}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Congestion Predictions Preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm">Upcoming Congestion Forecast</CardTitle>
              <CardDescription>15-minute ahead supervised classification (Random Forest)</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab('predictions')} className="text-xs">
              Model Diagnostics →
            </Button>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-2">
              {predictions.slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-foreground font-mono">{p.access_point}</span>
                      <span className="text-muted-foreground">({p.location})</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Current Util: <span className="font-mono">{p.current_utilization}%</span> • Window: {p.expected_window}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={p.risk_level === 'HIGH' ? 'destructive' : p.risk_level === 'MEDIUM' ? 'warning' : 'success'}
                      className="text-[10px] font-mono"
                    >
                      {p.prob_random_forest}% Risk
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

