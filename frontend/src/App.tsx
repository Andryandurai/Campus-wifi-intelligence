import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  analyticsApi,
  healthApi,
  campusApi,
  predictionsApi,
  recommendationsApi,
  anomaliesApi,
  adminApi,
} from './services/api';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { OverviewPage } from './pages/OverviewPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { PeakAnalysisPage } from './pages/PeakAnalysisPage';
import { AnomaliesPage } from './pages/AnomaliesPage';
import { ClusteringPage } from './pages/ClusteringPage';
import { CongestionPredictionPage } from './pages/CongestionPredictionPage';
import { CampusHeatmapPage } from './pages/CampusHeatmapPage';
import { RecommendationsPage } from './pages/RecommendationsPage';

export const App: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedBlockCode, setSelectedBlockCode] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [pipelineToast, setPipelineToast] = useState<string | null>(null);

  // Queries for core telemetry
  const { data: kpis } = useQuery({
    queryKey: ['kpis'],
    queryFn: analyticsApi.getKpis,
    refetchInterval: 30000,
  });

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: healthApi.getCurrent,
    refetchInterval: 30000,
  });

  const { data: campusLayout } = useQuery({
    queryKey: ['campusLayout'],
    queryFn: campusApi.getLayout,
    refetchInterval: 30000,
  });

  const { data: predictions } = useQuery({
    queryKey: ['predictions'],
    queryFn: predictionsApi.getLatest,
  });

  const { data: recommendations } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => recommendationsApi.getList(),
  });

  const { data: anomalies } = useQuery({
    queryKey: ['anomalies_top'],
    queryFn: () => anomaliesApi.getList('all', 10),
  });

  // Admin Pipeline Execution Mutation
  const pipelineMutation = useMutation({
    mutationFn: () => adminApi.runFullPipeline(14),
    onSuccess: (data) => {
      setPipelineToast('Full Data Pipeline executed! Models retrained and telemetry refreshed.');
      setTimeout(() => setPipelineToast(null), 5000);
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      setPipelineToast('Pipeline run failed. Please ensure admin privileges.');
      setTimeout(() => setPipelineToast(null), 5000);
    },
  });

  return (
    <div className="min-h-screen bg-[#fafafa] text-foreground font-sans flex flex-col">
      {/* Toast Notification */}
      {pipelineToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-elevation border border-slate-700 animate-in fade-in slide-in-from-bottom-5">
          {pipelineToast}
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        healthData={health}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onRunPipeline={() => pipelineMutation.mutate()}
        isPipelineRunning={pipelineMutation.isPending}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && kpis && health && campusLayout && (
          <OverviewPage
            kpis={kpis}
            health={health}
            blocks={campusLayout.blocks}
            predictions={predictions || []}
            recommendations={recommendations || []}
            anomalies={anomalies || []}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onSelectBlock={(code) => {
              setSelectedBlockCode(code);
              setActiveTab('heatmap');
            }}
          />
        )}

        {activeTab === 'analytics' && <AnalyticsPage />}

        {activeTab === 'peaks' && <PeakAnalysisPage />}

        {activeTab === 'anomalies' && <AnomaliesPage />}

        {activeTab === 'clustering' && <ClusteringPage />}

        {activeTab === 'predictions' && <CongestionPredictionPage />}

        {activeTab === 'heatmap' && campusLayout && (
          <CampusHeatmapPage
            blocks={campusLayout.blocks}
            selectedBlockCode={selectedBlockCode}
            onSelectBlock={(code) => setSelectedBlockCode(code)}
          />
        )}

        {activeTab === 'recommendations' && <RecommendationsPage />}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white mt-12 py-6 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-foreground">Campus Wi-Fi Intelligence System</span>
            <span>•</span>
            <span>Principles of Data Science (PDS)</span>
            <span>•</span>
            <span>Rajalakshmi Engineering College</span>
          </div>
          <div className="font-mono text-[11px]">
            Privacy-by-Design Verified • Anonymized 15-Minute Aggregations
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};
export default App;

