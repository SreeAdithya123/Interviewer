
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Search, Eye } from 'lucide-react';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import { useInterviewAnalyses } from '@/hooks/useInterviewAnalysis';
import InterviewDetailsModal from '../components/InterviewDetailsModal';
import { InterviewAnalysis } from '@/services/interviewAnalysisService';
import PageHeader from '@/components/app/PageHeader';
import { IconTile } from '@/components/app/primitives';
import Reveal from '@/components/marketing/Reveal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const InterviewHistory = () => {
  const navigate = useNavigate();
  const { data: analyses, isLoading, error } = useInterviewAnalyses();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedAnalysis, setSelectedAnalysis] = useState<InterviewAnalysis | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-primary/10 text-primary';
    if (score >= 70) return 'bg-amber-500/10 text-amber-600';
    return 'bg-destructive/10 text-destructive';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Average';
    return 'Needs Improvement';
  };

  const filteredAnalyses = analyses?.filter(analysis => {
    const matchesSearch = analysis.interview_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (analysis.feedback && analysis.feedback.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterType === 'all' || analysis.interview_type.toLowerCase().includes(filterType.toLowerCase());
    return matchesSearch && matchesFilter;
  }) || [];

  const interviewTypes = ['all', 'general', 'coding', 'upsc', 'friendly'];

  const header = (
    <PageHeader
      eyebrow="History"
      title={<>Interview <span className="text-spectrum">history</span></>}
      back={{ to: '/dashboard', label: 'Back to dashboard' }}
    />
  );

  if (isLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="min-h-screen bg-background">
            <div className="max-w-6xl mx-auto px-6 py-10 lg:py-14">
              {header}
              <div className="mt-8 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="p-6">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="mt-3 h-4 w-64" />
                    <Skeleton className="mt-4 h-14 w-full" />
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="min-h-screen bg-background">
            <div className="max-w-6xl mx-auto px-6 py-10 lg:py-14">
              {header}
              <Card className="mt-8 p-6">
                <h3 className="font-headline text-lg font-semibold tracking-headline text-destructive">
                  Error loading interview history
                </h3>
                <p className="mt-2 font-body text-sm text-muted-foreground">
                  {error instanceof Error ? error.message : 'Unknown error occurred'}
                </p>
              </Card>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="min-h-screen bg-background">
          <div className="max-w-6xl mx-auto px-6 py-10 lg:py-14">
            {header}

            {/* Filters and Search */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  strokeWidth={1.5}
                />
                <Input
                  type="text"
                  placeholder="Search interviews..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="sm:w-52">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  {interviewTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Interview List */}
            {filteredAnalyses.length === 0 ? (
              <Reveal className="flex flex-col items-center justify-center py-20 text-center">
                <IconTile icon={Calendar} size="lg" />
                <h3 className="mt-5 font-headline text-lg font-semibold tracking-headline text-foreground">
                  {searchTerm || filterType !== 'all' ? 'No interviews found' : 'No interviews yet'}
                </h3>
                <p className="mt-2 max-w-sm font-body text-sm text-muted-foreground">
                  {searchTerm || filterType !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Start your first interview to see your history here.'}
                </p>
                {!searchTerm && filterType === 'all' && (
                  <Button className="mt-6" onClick={() => navigate('/interview-copilot')}>
                    Start your first interview
                  </Button>
                )}
              </Reveal>
            ) : (
              <ul className="mt-8 space-y-4">
                {filteredAnalyses.map((analysis, index) => (
                  <Reveal as="li" key={analysis.id} index={Math.min(index, 6)}>
                    <Card
                      onClick={() => setSelectedAnalysis(analysis)}
                      className="p-6 hover:-translate-y-1 transition-transform duration-500 ease-out-quint cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="font-headline text-lg font-semibold tracking-headline text-foreground">
                              {analysis.interview_type}
                            </h3>
                            {analysis.overall_score && (
                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1 font-metric text-xs font-medium ${getScoreColor(analysis.overall_score)}`}
                              >
                                {analysis.overall_score}% · {getScoreLabel(analysis.overall_score)}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" strokeWidth={1.5} />
                              <span className="font-metric text-xs">
                                {new Date(analysis.created_at || '').toLocaleDateString()}
                              </span>
                            </div>
                            {analysis.duration_minutes && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4" strokeWidth={1.5} />
                                <span className="font-metric text-xs">{analysis.duration_minutes} minutes</span>
                              </div>
                            )}
                          </div>

                          {(analysis.communication_score || analysis.technical_score || analysis.confidence_score) && (
                            <div className="mt-4 flex divide-x divide-foreground/[0.06]">
                              {analysis.communication_score && (
                                <div className="flex-1 px-4 text-center first:pl-0">
                                  <div className="font-metric text-lg text-foreground">
                                    {analysis.communication_score}%
                                  </div>
                                  <div className="mt-0.5 text-[10px] uppercase tracking-label text-muted-foreground">
                                    Communication
                                  </div>
                                </div>
                              )}
                              {analysis.technical_score && (
                                <div className="flex-1 px-4 text-center first:pl-0">
                                  <div className="font-metric text-lg text-foreground">
                                    {analysis.technical_score}%
                                  </div>
                                  <div className="mt-0.5 text-[10px] uppercase tracking-label text-muted-foreground">
                                    Technical
                                  </div>
                                </div>
                              )}
                              {analysis.confidence_score && (
                                <div className="flex-1 px-4 text-center first:pl-0">
                                  <div className="font-metric text-lg text-foreground">
                                    {analysis.confidence_score}%
                                  </div>
                                  <div className="mt-0.5 text-[10px] uppercase tracking-label text-muted-foreground">
                                    Confidence
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {analysis.feedback && (
                            <p className="mt-4 line-clamp-2 font-body text-sm text-muted-foreground">
                              {analysis.feedback}
                            </p>
                          )}

                          <div className="mt-4 flex flex-wrap gap-2">
                            {analysis.strengths && analysis.strengths.slice(0, 2).map((strength, idx) => (
                              <span
                                key={idx}
                                className="rounded-full border border-foreground/[0.06] bg-muted/50 px-2.5 py-1 font-body text-xs text-foreground"
                              >
                                {strength}
                              </span>
                            ))}
                            {analysis.areas_for_improvement && analysis.areas_for_improvement.slice(0, 1).map((area, idx) => (
                              <span
                                key={idx}
                                className="rounded-full border border-foreground/[0.06] bg-muted/50 px-2.5 py-1 font-body text-xs text-foreground"
                              >
                                {area}
                              </span>
                            ))}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="View details"
                          className="shrink-0 text-muted-foreground"
                        >
                          <Eye className="h-5 w-5" strokeWidth={1.5} />
                        </Button>
                      </div>
                    </Card>
                  </Reveal>
                ))}
              </ul>
            )}
          </div>
        </div>

        {selectedAnalysis && (
          <InterviewDetailsModal
            analysis={selectedAnalysis}
            isOpen={!!selectedAnalysis}
            onClose={() => setSelectedAnalysis(null)}
          />
        )}
      </Layout>
    </ProtectedRoute>
  );
};

export default InterviewHistory;
