import React from 'react';
import { TrendingUp, Clock, MessageSquare, Award, Calendar } from 'lucide-react';
import { InterviewAnalysis } from '@/services/interviewAnalysisService';
import { Card } from '@/components/ui/card';
import { IconTile, StatusPill } from '@/components/app/primitives';

interface InterviewAnalysisCardProps {
  analysis: InterviewAnalysis;
}

const InterviewAnalysisCard: React.FC<InterviewAnalysisCardProps> = ({ analysis }) => {
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Average';
    return 'Needs Improvement';
  };

  return (
    <Card className="p-6 hover:-translate-y-1">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <IconTile icon={MessageSquare} tone="primary" size="md" />
          <div>
            <h3 className="text-lg font-semibold font-headline text-foreground">{analysis.interview_type}</h3>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" strokeWidth={1.5} />
              <span className="font-metric">{new Date(analysis.created_at || '').toLocaleDateString()}</span>
              {analysis.duration_minutes && (
                <>
                  <Clock className="h-4 w-4 ml-2" strokeWidth={1.5} />
                  <span className="font-metric">{analysis.duration_minutes} min</span>
                </>
              )}
            </div>
          </div>
        </div>
        {analysis.overall_score && (
          <div className="text-right">
            <div className={`text-2xl font-bold font-metric ${getScoreColor(analysis.overall_score)}`}>
              {analysis.overall_score}%
            </div>
            <div className="text-xs text-muted-foreground">
              {getScoreLabel(analysis.overall_score)}
            </div>
          </div>
        )}
      </div>

      {/* Score Breakdown */}
      {(analysis.communication_score || analysis.technical_score || analysis.confidence_score || analysis.problem_solving_score) && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          {analysis.communication_score && (
            <div className="text-center p-3 bg-muted/40 rounded-lg">
              <div className={`text-lg font-semibold font-metric ${getScoreColor(analysis.communication_score)}`}>
                {analysis.communication_score}%
              </div>
              <div className="text-xs text-muted-foreground">Communication</div>
            </div>
          )}
          {analysis.technical_score && (
            <div className="text-center p-3 bg-muted/40 rounded-lg">
              <div className={`text-lg font-semibold font-metric ${getScoreColor(analysis.technical_score)}`}>
                {analysis.technical_score}%
              </div>
              <div className="text-xs text-muted-foreground">Technical</div>
            </div>
          )}
          {analysis.confidence_score && (
            <div className="text-center p-3 bg-muted/40 rounded-lg">
              <div className={`text-lg font-semibold font-metric ${getScoreColor(analysis.confidence_score)}`}>
                {analysis.confidence_score}%
              </div>
              <div className="text-xs text-muted-foreground">Confidence</div>
            </div>
          )}
          {analysis.problem_solving_score && (
            <div className="text-center p-3 bg-muted/40 rounded-lg">
              <div className={`text-lg font-semibold font-metric ${getScoreColor(analysis.problem_solving_score)}`}>
                {analysis.problem_solving_score}%
              </div>
              <div className="text-xs text-muted-foreground">Problem Solving</div>
            </div>
          )}
        </div>
      )}

      {/* Strengths */}
      {analysis.strengths && analysis.strengths.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Award className="h-4 w-4 text-green-600" strokeWidth={1.5} />
            <span className="text-sm font-medium text-foreground">Strengths</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.strengths.slice(0, 3).map((strength, index) => (
              <StatusPill key={index} tone="active">
                {strength}
              </StatusPill>
            ))}
          </div>
        </div>
      )}

      {/* Areas for Improvement */}
      {analysis.areas_for_improvement && analysis.areas_for_improvement.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-4 w-4 text-blue-600" strokeWidth={1.5} />
            <span className="text-sm font-medium text-foreground">Areas for Improvement</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.areas_for_improvement.slice(0, 3).map((area, index) => (
              <StatusPill key={index} tone="warning">
                {area}
              </StatusPill>
            ))}
          </div>
        </div>
      )}

      {/* Feedback Preview */}
      {analysis.feedback && (
        <div className="border-t border-foreground/[0.06] pt-4">
          <div className="flex items-center space-x-2 mb-2">
            <MessageSquare className="h-4 w-4 text-accent" strokeWidth={1.5} />
            <span className="text-sm font-medium text-foreground">Feedback</span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {analysis.feedback}
          </p>
        </div>
      )}
    </Card>
  );
};

export default InterviewAnalysisCard;
