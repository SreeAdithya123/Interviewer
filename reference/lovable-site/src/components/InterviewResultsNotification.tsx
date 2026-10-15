import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Award, X } from 'lucide-react';
import { useLatestInterviewAnalysis } from '@/hooks/useInterviewAnalysis';
import { InterviewAnalysis } from '@/services/interviewAnalysisService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/app/primitives';

const InterviewResultsNotification = () => {
  const { data: latestAnalysis } = useLatestInterviewAnalysis();
  const [showNotification, setShowNotification] = useState(false);
  const [lastAnalysisId, setLastAnalysisId] = useState<string | null>(null);

  useEffect(() => {
    if (latestAnalysis && latestAnalysis.id !== lastAnalysisId) {
      setShowNotification(true);
      setLastAnalysisId(latestAnalysis.id);

      // Auto-hide after 10 seconds
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [latestAnalysis, lastAnalysisId]);

  if (!showNotification || !latestAnalysis) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <AnimatePresence>
      {showNotification && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.8 }}
          className="fixed top-4 right-4 z-50 max-w-md"
        >
          <Card className="p-6 shadow-ambient-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <IconTile icon={CheckCircle} tone="primary" size="md" />
                <div>
                  <h3 className="font-semibold font-headline text-foreground">Interview Complete!</h3>
                  <p className="text-sm text-muted-foreground">Your analysis is ready</p>
                </div>
              </div>
              <button
                onClick={() => setShowNotification(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            {latestAnalysis.overall_score && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Overall Score</span>
                  <span className={`text-2xl font-bold font-metric ${getScoreColor(latestAnalysis.overall_score)}`}>
                    {latestAnalysis.overall_score}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${latestAnalysis.overall_score}%` }}
                  />
                </div>
              </div>
            )}

            {/* Quick Score Breakdown */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {latestAnalysis.communication_score && (
                <div className="text-center p-2 bg-muted/40 rounded-lg">
                  <div className={`text-lg font-semibold font-metric ${getScoreColor(latestAnalysis.communication_score)}`}>
                    {latestAnalysis.communication_score}%
                  </div>
                  <div className="text-xs text-muted-foreground">Communication</div>
                </div>
              )}
              {latestAnalysis.technical_score && (
                <div className="text-center p-2 bg-muted/40 rounded-lg">
                  <div className={`text-lg font-semibold font-metric ${getScoreColor(latestAnalysis.technical_score)}`}>
                    {latestAnalysis.technical_score}%
                  </div>
                  <div className="text-xs text-muted-foreground">Technical</div>
                </div>
              )}
            </div>

            {/* Top Strength */}
            {latestAnalysis.strengths && latestAnalysis.strengths.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Award className="h-4 w-4 text-green-600" strokeWidth={1.5} />
                  <span className="text-sm font-medium text-foreground">Top Strength</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {latestAnalysis.strengths[0]}
                </p>
              </div>
            )}

            <div className="flex space-x-2">
              <Button
                className="flex-1"
                onClick={() => {
                  // Scroll to the interview analyses section
                  const element = document.querySelector('[data-interview-analyses]');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                  setShowNotification(false);
                }}
              >
                View Details
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowNotification(false)}
              >
                Dismiss
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InterviewResultsNotification;
