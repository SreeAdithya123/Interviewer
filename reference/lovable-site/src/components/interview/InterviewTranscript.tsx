
import React from 'react';
import Reveal from '@/components/marketing/Reveal';
import { StatusPill } from '@/components/app/primitives';
import { TranscriptEntry } from '../../pages/UPSCInterviewer';

interface InterviewTranscriptProps {
  transcript: TranscriptEntry[];
  isInterviewActive: boolean;
  onClearTranscript: () => void;
}

const InterviewTranscript: React.FC<InterviewTranscriptProps> = ({
  transcript,
  isInterviewActive,
  onClearTranscript
}) => {
  if (transcript.length === 0) return null;

  return (
    <Reveal as="div" className="mt-8 rounded-2xl border border-foreground/[0.06] bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-headline text-lg font-semibold tracking-tight text-foreground">Live Transcript</h3>
        <StatusPill tone={isInterviewActive ? 'live' : 'idle'}>
          {isInterviewActive ? 'Recording' : 'Idle'}
        </StatusPill>
      </div>

      <div className="h-64 overflow-y-auto rounded-xl bg-muted/40 p-4 space-y-3">
        {transcript.map((entry, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg ${
              entry.speaker === 'AI'
                ? 'bg-primary/[0.04] border-l-2 border-primary'
                : 'bg-muted/60 border-l-2 border-foreground/15'
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <span
                className={`font-body text-sm font-medium ${
                  entry.speaker === 'AI' ? 'text-primary' : 'text-foreground'
                }`}
              >
                {entry.speaker === 'AI' ? 'Interview Panel' : 'Candidate'}
              </span>
              <span className="font-metric text-xs text-muted-foreground">
                {entry.timestamp}
              </span>
            </div>
            <p className="font-body text-sm text-foreground/80">{entry.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={onClearTranscript}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear Transcript
        </button>
        <button className="text-sm text-primary hover:text-primary-hover transition-colors">
          Download Transcript
        </button>
      </div>
    </Reveal>
  );
};

export default InterviewTranscript;
