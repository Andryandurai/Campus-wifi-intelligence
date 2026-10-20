import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { peaksApi } from '../services/api';
import { Flame, RefreshCw, Calendar, Clock, BarChart2 } from 'lucide-react';

export const PeakAnalysisPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: peaks, isLoading } = useQuery({
    queryKey: ['peaksSummary'],
    queryFn: peaksApi.getSummary,
  });

  const runPeaksMutation = useMutation({
    mutationFn: peaksApi.runDetection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peaksSummary'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Peak Usage Detection</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Statistical thresholding (P90 percentile & ≥80% utilization) and recurrence ranking across weeks
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => runPeaksMutation.mutate()}
          isLoading={runPeaksMutation.isPending}
          className="text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          <span>Recompute Peaks</span>
        </Button>
      </div>

      {/* Featured Highlight Box from Project Document Section 6.2 */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 border border-red-200/80 text-xs">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 mt-0.5">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-red-950 text-sm">
              Primary Recurring Campus Bottleneck Detected
            </div>
            <div className="text-red-900 mt-1 leading-relaxed">
              <span className="font-semibold">Block B (IT & Computing)</span> exhibits consistent saturation on{' '}
              <span className="font-semibold">Fridays between 12:30 PM – 1:30 PM</span> reaching an average utilization of{' '}
              <span className="font-bold font-mono">92.4%</span> (recurs in 7 of 8 weeks).
            </div>
            <div className="mt-2 text-[11px] text-red-800 font-medium">
              Recommended action: Provision additional dual-band Wi-Fi 6 access points to distribute student laptop concurrency.
            </div>
          </div>
        </div>
      </div>

      {/* Ranked Peaks Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              <CardTitle>Top Recurring Peak Usage Windows</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              Threshold: P90 & Util ≥ 80%
            </Badge>
          </div>
          <CardDescription>
            Ranked by composite intensity score: (Average Utilization) × (Recurrence Frequency / Total Weeks)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-2.5">Rank</th>
                  <th className="p-2.5">Location</th>
                  <th className="p-2.5">Day</th>
                  <th className="p-2.5">Time Window</th>
                  <th className="p-2.5 font-mono">Avg Utilization</th>
                  <th className="p-2.5 font-mono">P90 Threshold</th>
                  <th className="p-2.5">Recurrence (Weeks)</th>
                  <th className="p-2.5 font-mono">Rank Score</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-muted-foreground">
                      Calculating peak windows...
                    </td>
                  </tr>
                ) : (
                  peaks?.map((peak, idx) => (
                    <tr key={peak.id || idx} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="p-2.5 font-bold font-mono text-muted-foreground">#{idx + 1}</td>
                      <td className="p-2.5 font-bold text-foreground">{peak.location}</td>
                      <td className="p-2.5">
                        <span className="inline-flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span>{peak.day}</span>
                        </span>
                      </td>
                      <td className="p-2.5 font-mono">
                        <span className="inline-flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span>{peak.time_slot}</span>
                        </span>
                      </td>
                      <td className="p-2.5 font-mono font-bold text-red-600">
                        {peak.avg_utilization}%
                      </td>
                      <td className="p-2.5 font-mono text-muted-foreground">
                        {peak.p90_utilization}%
                      </td>
                      <td className="p-2.5">
                        <span className="font-semibold text-foreground">
                          {peak.recurrence_weeks} of {peak.total_weeks} wks
                        </span>
                      </td>
                      <td className="p-2.5 font-mono font-bold text-foreground">
                        {peak.rank_score}
                      </td>
                      <td className="p-2.5">
                        <Badge
                          variant={peak.avg_utilization >= 88 ? 'destructive' : 'warning'}
                          className="text-[10px]"
                        >
                          {peak.avg_utilization >= 88 ? 'Severe Peak' : 'High Peak'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

