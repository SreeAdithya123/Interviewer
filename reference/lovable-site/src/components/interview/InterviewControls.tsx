import React from 'react';
import { MessageSquare, LogOut, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/app/primitives';

interface InterviewControlsProps {
  isInterviewActive: boolean;
  onStartInterview: () => void;
  onExitInterview: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

const InterviewControls: React.FC<InterviewControlsProps> = ({
  isInterviewActive,
  onStartInterview,
  onExitInterview,
  isMuted = false,
  onToggleMute
}) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {!isInterviewActive ? (
        <Button onClick={onStartInterview} size="lg">
          <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
          Start AI Interview
        </Button>
      ) : (
        <>
          <StatusPill tone="active">AI Interview in Progress</StatusPill>

          <Button variant="outline" onClick={onToggleMute}>
            {isMuted ? (
              <MicOff className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <Mic className="h-4 w-4" strokeWidth={1.5} />
            )}
            {isMuted ? 'Unmute' : 'Mute'}
          </Button>

          <Button variant="destructive" onClick={onExitInterview}>
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
            End Interview
          </Button>
        </>
      )}
    </div>
  );
};

export default InterviewControls;
