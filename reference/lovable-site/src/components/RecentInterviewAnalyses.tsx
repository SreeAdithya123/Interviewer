import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserInterviewAnalyses, InterviewAnalysis } from '@/services/interviewAnalysisService';
import Reveal from '@/components/marketing/Reveal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import InterviewAnalysisCard from './InterviewAnalysisCard';
import InterviewDetailsModal from './InterviewDetailsModal';
import AnalysisFeedbackButton from './AnalysisFeedbackButton';

const RecentInterviewAnalyses = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedAnalysis, setSelectedAnalysis] = useState<InterviewAnalysis | null>(null);
  const { data: analyses, isLoading, error } = useQuery({
    queryKey: ['interview-analyses'],
    queryFn: getUserInterviewAnalyses,
  });

  // Listen for new analysis events and refresh data
  useEffect(() => {
    const handleNewAnalysis = () => {
      console.log('🔄 New analysis event received, refreshing data...');
      queryClient.invalidateQueries({ queryKey: ['interview-analyses'] });
    };

    window.addEventListener('newInterviewAnalysis', handleNewAnalysis);
    return () => {
      window.removeEventListener('newInterviewAnalysis', handleNewAnalysis);
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <Reveal>
        <Card className="p-4 sm:p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-48 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded"></div>
            </div>
          </div>
        </Card>
      </Reveal>
    );
  }

  if (error) {
    return (
      <Reveal>
        <Card className="p-4 sm:p-6">
          <div className="text-center">
            <div className="text-destructive mb-2">Error loading interview analyses</div>
            <div className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </div>
          </div>
        </Card>
      </Reveal>
    );
  }

  if (!analyses || analyses.length === 0) {
    return (
      <Reveal>
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" strokeWidth={1.5} />
              <h3 className="text-base sm:text-lg font-semibold font-headline text-foreground">Recent Interview Analyses</h3>
            </div>
            <AnalysisFeedbackButton />
          </div>
          <div className="text-center py-6 sm:py-8">
            <div className="text-muted-foreground mb-2">No interview analyses yet</div>
            <div className="text-sm text-muted-foreground mb-4">
              Complete an interview to see your analysis here
            </div>
          </div>
        </Card>
      </Reveal>
    );
  }

  return (
    <>
      <Reveal className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" strokeWidth={1.5} />
            <h3 className="text-base sm:text-lg font-semibold font-headline text-foreground">Recent Interview Analyses</h3>
            <div className="flex items-center gap-1 text-green-600 text-xs sm:text-sm font-medium">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={1.5} />
              <span className="font-metric">{analyses.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AnalysisFeedbackButton />
            {analyses.length > 2 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/interview-history')}
              >
                <span>View All</span>
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={1.75} />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {analyses.slice(0, 4).map((analysis) => (
            <div key={analysis.id} onClick={() => setSelectedAnalysis(analysis)}>
              <InterviewAnalysisCard analysis={analysis} />
            </div>
          ))}
        </div>

        {analyses.length > 4 && (
          <div className="text-center">
            <Button onClick={() => navigate('/interview-history')}>
              View All Analyses ({analyses.length})
            </Button>
          </div>
        )}
      </Reveal>

      {/* Details Modal */}
      {selectedAnalysis && (
        <InterviewDetailsModal
          analysis={selectedAnalysis}
          isOpen={!!selectedAnalysis}
          onClose={() => setSelectedAnalysis(null)}
        />
      )}
    </>
  );
};

export default RecentInterviewAnalyses;
