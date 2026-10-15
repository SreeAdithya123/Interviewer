import React from 'react';
import { Plus, Brain } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusPill, IconTile } from '@/components/app/primitives';

interface InterviewSession {
  id: string;
  type: string;
  date: string;
  duration: string;
  status: string;
}

interface InterviewSessionsPanelProps {
  completedInterviews: InterviewSession[];
  onStartFirstInterview: () => void;
}

const InterviewSessionsPanel: React.FC<InterviewSessionsPanelProps> = ({
  completedInterviews,
  onStartFirstInterview
}) => {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 border-b border-foreground/[0.06] p-6 sm:p-8">
        <div>
          <h2 className="font-metric text-[11px] uppercase tracking-label text-muted-foreground">
            Your interview sessions
          </h2>
          <p className="mt-1.5 font-body text-sm text-muted-foreground">
            Track your progress and review past interviews
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          New Session
        </Button>
      </CardHeader>

      {completedInterviews.length > 0 ? (
        <div className="divide-y divide-foreground/[0.06]">
          {completedInterviews.map((interview) => (
            <div
              key={interview.id}
              className="flex items-center justify-between gap-4 px-6 py-5 transition-colors hover:bg-muted/40 sm:px-8"
            >
              <div>
                <h3 className="font-headline text-base font-semibold tracking-tight text-foreground">
                  {interview.type}
                </h3>
                <p className="mt-1 font-metric text-xs text-muted-foreground">
                  {interview.date} · {interview.duration}
                </p>
              </div>
              <StatusPill tone="active">{interview.status}</StatusPill>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center px-6 py-16 text-center sm:px-8">
          <IconTile icon={Brain} size="lg" />
          <h3 className="mt-5 font-headline text-lg font-semibold tracking-tight text-foreground">
            Ready to start your first interview?
          </h3>
          <p className="mt-2 max-w-md font-body text-sm leading-body text-muted-foreground">
            Begin your interview preparation journey with our AI-powered system and get instant
            feedback on your performance.
          </p>
          <Button className="mt-6" onClick={onStartFirstInterview}>
            Start Your First Interview
          </Button>
        </div>
      )}
    </Card>
  );
};

export default InterviewSessionsPanel;
