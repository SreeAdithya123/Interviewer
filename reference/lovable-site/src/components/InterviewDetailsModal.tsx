
import React from 'react';
import { X, Clock, MessageCircle, TrendingUp, Target } from 'lucide-react';
import { InterviewAnalysis } from '@/services/interviewAnalysisService';
import { useInterviewQuestions } from '@/hooks/useInterviewQuestions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface InterviewDetailsModalProps {
  analysis: InterviewAnalysis;
  isOpen: boolean;
  onClose: () => void;
}

const InterviewDetailsModal: React.FC<InterviewDetailsModalProps> = ({
  analysis,
  isOpen,
  onClose,
}) => {
  const { data: questions, isLoading: questionsLoading } = useInterviewQuestions(analysis.id || '');

  if (!isOpen) return null;

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
    <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-foreground/[0.06]">
          <div>
            <h2 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
              {analysis.interview_type}
            </h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="font-metric">
                {new Date(analysis.created_at || '').toLocaleDateString()}
              </span>
              {analysis.duration_minutes && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" strokeWidth={1.5} />
                  <span className="font-metric">{analysis.duration_minutes} min</span>
                </span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <X className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Overall Scores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {analysis.overall_score && (
              <div className="text-center rounded-2xl border border-foreground/[0.06] bg-muted/40 p-4">
                <div className={`font-metric text-3xl font-semibold ${getScoreColor(analysis.overall_score)}`}>
                  {analysis.overall_score}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">Overall Score</div>
                <div className="text-xs text-muted-foreground">
                  {getScoreLabel(analysis.overall_score)}
                </div>
              </div>
            )}
            {analysis.communication_score && (
              <div className="text-center rounded-2xl border border-foreground/[0.06] bg-muted/40 p-4">
                <div className={`font-metric text-2xl font-semibold ${getScoreColor(analysis.communication_score)}`}>
                  {analysis.communication_score}%
                </div>
                <div className="text-sm text-muted-foreground">Communication</div>
              </div>
            )}
            {analysis.technical_score && (
              <div className="text-center rounded-2xl border border-foreground/[0.06] bg-muted/40 p-4">
                <div className={`font-metric text-2xl font-semibold ${getScoreColor(analysis.technical_score)}`}>
                  {analysis.technical_score}%
                </div>
                <div className="text-sm text-muted-foreground">Technical</div>
              </div>
            )}
            {analysis.confidence_score && (
              <div className="text-center rounded-2xl border border-foreground/[0.06] bg-muted/40 p-4">
                <div className={`font-metric text-2xl font-semibold ${getScoreColor(analysis.confidence_score)}`}>
                  {analysis.confidence_score}%
                </div>
                <div className="text-sm text-muted-foreground">Confidence</div>
              </div>
            )}
          </div>

          {/* Strengths and Areas for Improvement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {analysis.strengths && analysis.strengths.length > 0 && (
              <div className="rounded-2xl border border-foreground/[0.06] bg-primary/[0.04] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  <h3 className="font-headline text-lg font-semibold text-foreground">Strengths</h3>
                </div>
                <div className="space-y-2">
                  {analysis.strengths.map((strength, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0" />
                      <p className="text-sm text-muted-foreground">{strength}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.areas_for_improvement && analysis.areas_for_improvement.length > 0 && (
              <div className="rounded-2xl border border-foreground/[0.06] bg-destructive/[0.04] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-destructive" strokeWidth={1.5} />
                  <h3 className="font-headline text-lg font-semibold text-foreground">Areas for Improvement</h3>
                </div>
                <div className="space-y-2">
                  {analysis.areas_for_improvement.map((area, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-destructive rounded-full mt-2 shrink-0" />
                      <p className="text-sm text-muted-foreground">{area}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Overall Feedback */}
          {analysis.feedback && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="h-5 w-5 text-primary" strokeWidth={1.5} />
                <h3 className="font-headline text-lg font-semibold text-foreground">Overall Feedback</h3>
              </div>
              <div className="rounded-2xl border border-foreground/[0.06] bg-primary/[0.04] p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{analysis.feedback}</p>
              </div>
            </div>
          )}

          {/* Detailed Questions */}
          {questions && questions.length > 0 && (
            <div>
              <h3 className="font-headline text-lg font-semibold text-foreground mb-4">
                Question-by-Question Breakdown
              </h3>
              <div className="space-y-6">
                {questions.map((question, index) => (
                  <div
                    key={question.id || index}
                    className="rounded-2xl border border-foreground/[0.06] p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-headline text-base font-medium text-foreground">
                        Question {question.question_order || index + 1}
                      </h4>
                      {question.question_score && (
                        <span className={`font-metric text-lg font-semibold ${getScoreColor(question.question_score)}`}>
                          {question.question_score}%
                        </span>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-foreground mb-2">Question:</p>
                        <p className="text-sm text-muted-foreground bg-primary/[0.04] p-3 rounded-xl">
                          {question.question_text}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-foreground mb-2">Your Answer:</p>
                        <p className="text-sm text-muted-foreground bg-muted/40 p-3 rounded-xl">
                          {question.user_answer}
                        </p>
                      </div>

                      {question.ai_feedback && (
                        <div>
                          <p className="text-sm font-medium text-foreground mb-2">AI Feedback:</p>
                          <p className="text-sm text-muted-foreground bg-primary/[0.04] p-3 rounded-xl">
                            {question.ai_feedback}
                          </p>
                        </div>
                      )}

                      {(question.fluency_score || question.confidence_score) && (
                        <dl className="divide-y divide-foreground/[0.06] rounded-2xl border border-foreground/[0.06] bg-muted/40 px-4">
                          {question.fluency_score && (
                            <div className="flex items-center justify-between py-2.5 text-sm">
                              <dt className="text-muted-foreground">Fluency</dt>
                              <dd className={`font-metric font-medium ${getScoreColor(question.fluency_score)}`}>
                                {question.fluency_score}%
                              </dd>
                            </div>
                          )}
                          {question.confidence_score && (
                            <div className="flex items-center justify-between py-2.5 text-sm">
                              <dt className="text-muted-foreground">Confidence</dt>
                              <dd className={`font-metric font-medium ${getScoreColor(question.confidence_score)}`}>
                                {question.confidence_score}%
                              </dd>
                            </div>
                          )}
                        </dl>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {questionsLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading question details...</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default InterviewDetailsModal;
