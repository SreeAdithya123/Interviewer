import React from 'react';
import { StatusPill } from '@/components/app/primitives';

interface InterviewStatusProps {
  isInterviewActive: boolean;
}

const InterviewStatus: React.FC<InterviewStatusProps> = ({ isInterviewActive }) => {
  if (!isInterviewActive) return null;

  return (
    <div className="rounded-2xl border border-foreground/[0.06] bg-card p-6 shadow-soft">
      <div className="flex flex-col items-center gap-2 text-center">
        <StatusPill tone="active">Interview active</StatusPill>
        <p className="font-body text-sm text-muted-foreground">
          Speak naturally. The AI will ask you questions and respond to your answers.
        </p>
      </div>
    </div>
  );
};

export default InterviewStatus;
