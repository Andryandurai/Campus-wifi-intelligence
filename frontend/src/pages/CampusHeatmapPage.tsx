import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ThreeCampusViewer } from '../components/ThreeCampusViewer';
import { CampusBlock3D } from '../types';
import { campusApi } from '../services/api';
import { useQuery } from '@tanstack/react-query';
import { Map, Layers, Radio, Activity, Users, Clock, Wifi } from 'lucide-react';

interface CampusHeatmapPageProps {
  blocks: CampusBlock3D[];
  selectedBlockCode: string | null;
  onSelectBlock: (code: string | null) => void;
}

export const CampusHeatmapPage: React.FC<CampusHeatmapPageProps> = ({
  blocks,
  selectedBlockCode,
  onSelectBlock,
}) => {
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [activeMetric, setActiveMetric] = useState<'utilization' | 'devices' | 'latency' | 'risk'>('utilization');

  // Query for block drilldown details when selected
  const { data: drilldownData, isLoading: isDrilldownLoading } = useQuery({
    queryKey: ['blockDrilldown', selectedBlockCode],
    queryFn: () => (selectedBlockCode ? campusApi.getBlockDrilldown(selectedBlockCode) : null),
    enabled: !!selectedBlockCode,
  });

  const getBlockColorClass = (b: CampusBlock3D) => {
    if (activeMetric === 'devices') {
      const dev = b.telemetry.total_devices;
      if (dev >= 500) return 'bg-red-500 text-white';
      if (dev >= 300) return 'bg-amber-400 text-slate-900';
      if (dev >= 150) return 'bg-yellow-200 text-slate-800';
      return 'bg-emerald-200 text-emerald-950';
    } else if (activeMetric === 'latency') {
      const lat = b.telemetry.avg_latency;
      if (lat >= 80) return 'bg-red-500 text-white';
      if (lat >= 50) return 'bg-amber-400 text-slate-900';
      return 'bg-emerald-100 text-emerald-900';
    } else if (activeMetric === 'risk') {
      if (b.prediction.risk === 'HIGH') return 'bg-red-500 text-white';
      if (b.prediction.risk === 'MEDIUM') return 'bg-amber-400 text-slate-900';
      return 'bg-emerald-100 text-emerald-900';
    } else {
      // Utilization (Figure 4)
      const u = b.telemetry.avg_utilization;
      if (u >= 85) return 'bg-red-600 text-white';
      if (u >= 70) return 'bg-orange-400 text-slate-950';
      if (u >= 45) return 'bg-yellow-200 text-slate-900';
      return 'bg-emerald-300 text-emerald-950';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metric Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Campus Network Heatmap</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Spatial representation of network demand, live access-point telemetry, and 3D architectural digital twin
          </p>
        </div>

        {/* View Switcher and Metric Selectors */}
        <div className="flex items-center space-x-2">
          {/* 3D vs 2D Toggle */}
          <div className="flex items-center space-x-1 p-1 bg-muted rounded-lg border border-border text-xs">
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === '3d' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              3D Digital Twin
            </button>
            <button
              onClick={() => setViewMode('2d')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === '2d' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              2D Schematic
            </button>
          </div>

          {/* Metric Selector */}
          <select
            value={activeMetric}
            onChange={(e) => setActiveMetric(e.target.value as any)}
            className="px-3 py-1.5 text-xs rounded-md border border-border bg-white text-foreground focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="utilization">Metric: Bandwidth Util %</option>
            <option value="devices">Metric: Device Count</option>
            <option value="latency">Metric: Latency (ms)</option>
            <option value="risk">Metric: Congestion Risk</option>
          </select>
        </div>
      </div>

      {/* Main View Display */}
      {viewMode === '3d' ? (
        <ThreeCampusViewer
          blocks={blocks}
          onSelectBlock={(code) => onSelectBlock(code)}
          selectedBlockCode={selectedBlockCode}
          metricMode={activeMetric === 'devices' ? 'utilization' : activeMetric}
          height="580px"
        />
      ) : (
        /* 2D Schematic Block Map (Faithful to Figure 4 in Project Document) */
        <Card className="p-6 bg-white">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>REC Campus Spatial Block Schematic (Figure 4 Layout)</span>
            <span>Click any block for access-point breakdown</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {blocks.map((block) => (
              <div
                key={block.code}
                onClick={() => onSelectBlock(block.code)}
                className={`p-5 rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-200 cursor-pointer hover:scale-[1.02] flex flex-col justify-between min-h-[160px] ${getBlockColorClass(
                  block
                )}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-sm tracking-tight">{block.name}</span>
                    <Badge variant="outline" className="bg-white/80 text-[10px] text-slate-800 font-mono">
                      {block.type}
                    </Badge>
                  </div>
                  <div className="text-[11px] opacity-80">{block.floors} Floors • Cap: {block.capacity}</div>
                </div>

                <div className="mt-4 pt-3 border-t border-black/10 flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-black font-mono leading-none">
                      {activeMetric === 'devices'
                        ? block.telemetry.total_devices
                        : activeMetric === 'latency'
                        ? `${block.telemetry.avg_latency} ms`
                        : `${block.telemetry.avg_utilization}%`}
                    </div>
                    <div className="text-[10px] uppercase font-bold tracking-wider mt-1 opacity-90">
                      {block.status_text}
                    </div>
                  </div>
                  <span className="text-[10px] underline font-medium">AP Details →</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Building Drill-Down Modal */}
      {selectedBlockCode && (
        <Modal
          isOpen={!!selectedBlockCode}
          onClose={() => onSelectBlock(null)}
          title={`Campus Zone Drill-Down: ${selectedBlockCode}`}
          description="Detailed access-point concurrency and 24-hour diurnal load trends"
          maxWidth="max-w-2xl"
        >
          {isDrilldownLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Retrieving access-point telemetry...
            </div>
          ) : drilldownData ? (
            <div className="space-y-4">
              {/* Block Info Header */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-muted rounded-lg border border-border text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Building Type</span>
                  <span className="font-semibold text-foreground">{drilldownData.block.type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Physical Capacity</span>
                  <span className="font-semibold text-foreground font-mono">{drilldownData.block.capacity} people</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Active AP Transceivers</span>
                  <span className="font-semibold text-foreground font-mono">{drilldownData.access_points.length} Units</span>
                </div>
              </div>

              {/* Individual APs Table */}
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                  Access Point Sub-Nodes
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                        <th className="p-2">AP Identifier</th>
                        <th className="p-2 font-mono">Connected Devices</th>
                        <th className="p-2 font-mono">Utilization %</th>
                        <th className="p-2 font-mono">Latency</th>
                        <th className="p-2 font-mono">Packet Loss</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drilldownData.access_points.map((ap: any) => (
                        <tr key={ap.access_point} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="p-2 font-mono font-bold text-foreground">{ap.access_point}</td>
                          <td className="p-2 font-mono font-semibold">{ap.avg_devices}</td>
                          <td className="p-2 font-mono font-semibold text-primary">{ap.avg_utilization}%</td>
                          <td className="p-2 font-mono text-muted-foreground">{ap.avg_latency} ms</td>
                          <td className="p-2 font-mono text-muted-foreground">{ap.avg_packet_loss}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Hourly Trend Curve */}
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                  24-Hour Diurnal Demand Curve
                </h4>
                <div className="p-3 bg-muted/40 rounded-lg border border-border">
                  <div className="flex items-end space-x-1.5 h-28 pt-2">
                    {drilldownData.hourly_trend.slice(0, 24).map((slot: any, idx: number) => {
                      const heightPct = Math.min(100, Math.max(8, slot.utilization));
                      return (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center justify-end h-full group relative"
                        >
                          <div
                            className={`w-full rounded-t transition-all ${
                              slot.utilization >= 80 ? 'bg-red-500' : slot.utilization >= 55 ? 'bg-amber-400' : 'bg-emerald-500'
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                          <span className="text-[9px] font-mono text-muted-foreground mt-1 hidden md:block">
                            {idx % 4 === 0 ? `${idx}h` : ''}
                          </span>
                          {/* Hover Tooltip */}
                          <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 bg-slate-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap font-mono pointer-events-none">
                            {slot.time}: {slot.utilization}% ({slot.devices} dev)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
};

