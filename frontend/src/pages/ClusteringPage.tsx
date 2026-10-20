import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ThreeClusterViewer } from '../components/ThreeClusterViewer';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clustersApi } from '../services/api';
import { RefreshCw, Share2, Layers, CheckCircle2 } from 'lucide-react';

export const ClusteringPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: clusters, isLoading } = useQuery({
    queryKey: ['clustersList'],
    queryFn: clustersApi.getList,
  });

  const runClustersMutation = useMutation({
    mutationFn: clustersApi.runClustering,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clustersList'] });
    },
  });

  const clusterCategories = [
    {
      name: 'High-Demand Zones',
      color: 'bg-red-500',
      badge: 'destructive',
      desc: 'High device concurrency, high bandwidth utilization and large data transfers.',
      action: 'Prioritize Wi-Fi 6 multi-user MIMO AP upgrades and load-balancing.',
    },
    {
      name: 'Moderate Zones',
      color: 'bg-emerald-500',
      badge: 'success',
      desc: 'Balanced capacity and steady demand with low packet loss.',
      action: 'Standard routine maintenance and scheduled firmware updates.',
    },
    {
      name: 'Underutilized Zones',
      color: 'bg-blue-500',
      badge: 'info',
      desc: 'Consistently low device counts and negligible bandwidth utilization.',
      action: 'Candidate for hardware AP relocation to alleviate high-demand blocks.',
    },
    {
      name: 'Unstable Zones',
      color: 'bg-amber-500',
      badge: 'warning',
      desc: 'Elevated latency and sporadic packet loss despite moderate device loads.',
      action: 'Investigate RF interference, channel overlap (2.4/5GHz), or faulty cabling.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Location Clustering (K-Means)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Unsupervised machine learning grouping access points into 4 operational zones with 3D PCA projection
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="px-3 py-1 bg-muted rounded-lg border border-border text-xs font-mono">
            Silhouette Score: <span className="font-bold text-emerald-600">0.49</span> • DB Index: <span className="font-bold">0.82</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => runClustersMutation.mutate()}
            isLoading={runClustersMutation.isPending}
            className="text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Re-cluster APs</span>
          </Button>
        </div>
      </div>

      {/* 4 Discovered Zone Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {clusterCategories.map((c) => (
          <Card key={c.name} className="border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <span className={`w-3 h-3 rounded-full ${c.color}`} />
                <CardTitle className="text-xs font-bold">{c.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs pt-0">
              <p className="text-muted-foreground text-[11px] leading-relaxed">{c.desc}</p>
              <div className="p-2 rounded bg-muted/60 border border-border/80 text-[11px] text-foreground font-medium">
                💡 <span className="text-muted-foreground font-normal">IT Action:</span> {c.action}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3D PCA Cluster Scatter Visualization in Three.js */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">3D PCA Feature Space Scatter</h3>
            <p className="text-xs text-muted-foreground">
              Principal Component Analysis 3D projection of normalized AP profile vectors (Drag to orbit, scroll to zoom)
            </p>
          </div>
        </div>
        <ThreeClusterViewer clusters={clusters || []} height="480px" />
      </div>

      {/* Access Points Cluster Membership Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Access Point Profiles & Suggested Action</CardTitle>
            <Badge variant="outline" className="text-xs font-mono">
              {clusters?.length || 0} APs Clustered
            </Badge>
          </div>
          <CardDescription>
            Multi-metric centroid profiling across devices, utilization %, traffic (GB), latency, and packet loss
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-2.5">Access Point</th>
                  <th className="p-2.5">Location</th>
                  <th className="p-2.5">Assigned Cluster</th>
                  <th className="p-2.5 font-mono">Avg Devices</th>
                  <th className="p-2.5 font-mono">Avg Util %</th>
                  <th className="p-2.5 font-mono">Avg Traffic (GB)</th>
                  <th className="p-2.5 font-mono">Latency (ms)</th>
                  <th className="p-2.5 font-mono">Loss %</th>
                  <th className="p-2.5">Actionable Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-muted-foreground">
                      Loading cluster profiles...
                    </td>
                  </tr>
                ) : (
                  clusters?.map((ap) => (
                    <tr key={ap.id || ap.access_point} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="p-2.5 font-bold font-mono text-foreground">{ap.access_point}</td>
                      <td className="p-2.5 font-semibold text-foreground">{ap.location}</td>
                      <td className="p-2.5">
                        <Badge
                          variant={
                            ap.cluster_name.includes('High-Demand')
                              ? 'destructive'
                              : ap.cluster_name.includes('Moderate')
                              ? 'success'
                              : ap.cluster_name.includes('Underutilized')
                              ? 'info'
                              : 'warning'
                          }
                          className="text-[10px]"
                        >
                          {ap.cluster_name}
                        </Badge>
                      </td>
                      <td className="p-2.5 font-mono font-semibold">{ap.avg_devices}</td>
                      <td className="p-2.5 font-mono font-semibold">{ap.avg_utilization}%</td>
                      <td className="p-2.5 font-mono text-muted-foreground">{ap.avg_traffic_gb} GB</td>
                      <td className="p-2.5 font-mono text-muted-foreground">{ap.avg_latency} ms</td>
                      <td className="p-2.5 font-mono text-muted-foreground">{ap.avg_packet_loss}%</td>
                      <td className="p-2.5 text-[11px] text-muted-foreground">{ap.suggested_action}</td>
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

