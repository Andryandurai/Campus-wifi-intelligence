import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { RecommendationItem } from '../types';
import { recommendationsApi } from '../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lightbulb, CheckCircle2, Clock, ShieldCheck, ArrowRight, Filter } from 'lucide-react';

export const RecommendationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['recommendations', statusFilter],
    queryFn: () => recommendationsApi.getList(statusFilter),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      recommendationsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });

  const filteredRecs =
    categoryFilter === 'all'
      ? recommendations
      : recommendations?.filter((r) => r.category.toLowerCase() === categoryFilter.toLowerCase());

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Data-Driven IT Recommendations</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rule-based prescriptive actions derived from congestion models, peak recurrence, and K-Means clustering
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-border shadow-subtle text-xs">
        {/* Category Pills */}
        <div className="flex items-center space-x-1.5">
          <span className="text-muted-foreground font-medium mr-1">Category:</span>
          {['all', 'Capacity', 'Reliability', 'Rebalance', 'Security'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer capitalize ${
                categoryFilter === cat
                  ? 'bg-primary text-white font-semibold'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Status Pills */}
        <div className="flex items-center space-x-1.5">
          <span className="text-muted-foreground font-medium mr-1">Status:</span>
          {['all', 'Pending', 'In Progress', 'Applied'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer capitalize ${
                statusFilter === st
                  ? 'bg-primary text-white font-semibold'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendations Cards Grid */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading recommendations...</div>
        ) : filteredRecs?.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground bg-white rounded-xl border border-border">
            No recommendations matching current filters.
          </div>
        ) : (
          filteredRecs?.map((rec) => (
            <Card key={rec.id} className="border-border hover:border-slate-300 transition-colors">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left content */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          rec.priority === 'High'
                            ? 'destructive'
                            : rec.priority === 'Medium'
                            ? 'warning'
                            : 'secondary'
                        }
                        className="text-[10px]"
                      >
                        {rec.priority} Priority
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {rec.category}
                      </Badge>
                      <span className="text-xs font-bold text-foreground font-mono">
                        Zone: {rec.location}
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground ml-auto md:ml-0">
                        Trigger: {rec.metric_trigger}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-foreground tracking-tight">{rec.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>

                    {/* Prescriptive Action Pill */}
                    <div className="p-3 rounded-lg bg-muted/60 border border-border/80 flex items-start space-x-2 text-xs">
                      <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-foreground">Actionable Guidance: </span>
                        <span className="text-slate-700">{rec.suggested_action}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Action Workflow Toggles */}
                  <div className="flex md:flex-col items-end justify-between md:justify-center gap-2 border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-5 min-w-[140px]">
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">Workflow Status</div>
                      <Badge
                        variant={
                          rec.status === 'Applied'
                            ? 'success'
                            : rec.status === 'In Progress'
                            ? 'info'
                            : 'secondary'
                        }
                        className="text-[11px] mt-1"
                      >
                        {rec.status}
                      </Badge>
                    </div>

                    <div className="flex space-x-1 mt-2">
                      {rec.status !== 'In Progress' && rec.status !== 'Applied' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: rec.id, status: 'In Progress' })}
                          className="text-[11px] h-7 px-2"
                        >
                          Mark Active
                        </Button>
                      )}
                      {rec.status !== 'Applied' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: rec.id, status: 'Applied' })}
                          className="text-[11px] h-7 px-2"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Apply
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

