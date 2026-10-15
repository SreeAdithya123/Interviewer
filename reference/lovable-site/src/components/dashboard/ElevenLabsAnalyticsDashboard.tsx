import React from 'react';
import { useElevenLabsAnalytics } from '@/hooks/useElevenLabsAnalytics';
import ScoreProgressChart from './ScoreProgressChart';
import StrengthsWeaknessesCloud from './StrengthsWeaknessesCloud';
import FeedbackSummaryCharts from './FeedbackSummaryCharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Loader2 } from 'lucide-react';
import Reveal from '@/components/marketing/Reveal';

const EYEBROW = 'font-body text-[10px] uppercase tracking-label text-muted-foreground/70';

const ElevenLabsAnalyticsDashboard: React.FC = () => {
  const { data: analytics, isLoading, error } = useElevenLabsAnalytics();

  if (isLoading) {
    return (
      <Reveal>
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <div className={EYEBROW}>Analytics</div>
            <div className="flex items-center gap-2">
              <BarChart3 strokeWidth={1.5} className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="font-headline text-lg font-semibold">Analytics Dashboard</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">Loading your interview analytics...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 strokeWidth={1.5} className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </Reveal>
    );
  }

  if (error) {
    return (
      <Reveal>
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <div className={EYEBROW}>Analytics</div>
            <div className="flex items-center gap-2">
              <BarChart3 strokeWidth={1.5} className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
              <CardTitle className="font-headline text-lg font-semibold">Analytics Dashboard</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">Error loading analytics data</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Unable to load analytics data. Please try again later.
            </p>
          </CardContent>
        </Card>
      </Reveal>
    );
  }

  if (!analytics || analytics.scoreProgression.length === 0) {
    return (
      <Reveal>
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <div className={EYEBROW}>Analytics</div>
            <div className="flex items-center gap-2">
              <BarChart3 strokeWidth={1.5} className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="font-headline text-lg font-semibold">Analytics Dashboard</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">Complete interviews to see your progress</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your analytics will appear here after completing your first interview with ElevenLabs AI.
            </p>
          </CardContent>
        </Card>
      </Reveal>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Reveal className="text-center">
        <div className={EYEBROW}>Overview</div>
        <h2 className="text-lg sm:text-2xl font-semibold font-headline text-foreground mb-1 sm:mb-2">Interview Analytics Dashboard</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Track your progress with visual insights from your AI interview sessions
        </p>
      </Reveal>

      {/* Score Progress Chart */}
      <ScoreProgressChart data={analytics.scoreProgression} />

      {/* Strengths and Weaknesses Word Clouds */}
      <StrengthsWeaknessesCloud
        strengths={analytics.strengthsWeaknesses.strengths}
        weaknesses={analytics.strengthsWeaknesses.weaknesses}
      />

      {/* Skills Performance and Category Charts */}
      <FeedbackSummaryCharts
        skillsData={analytics.skillsPerformance}
        categoryData={analytics.interviewCategories}
      />
    </div>
  );
};

export default ElevenLabsAnalyticsDashboard;
