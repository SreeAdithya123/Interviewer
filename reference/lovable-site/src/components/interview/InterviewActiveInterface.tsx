import React from 'react';
import { ArrowLeft, Laptop, Code } from 'lucide-react';
import { useConversation } from '@11labs/react';
import { TranscriptEntry } from '../../pages/InterviewCopilot';
import InterviewInterface from './InterviewInterface';
import InterviewControls from './InterviewControls';
import InterviewTranscript from './InterviewTranscript';
import InterviewStatus from './InterviewStatus';
import InterviewTimer from './InterviewTimer';
import { Button } from '@/components/ui/button';
import { IconTile, StatusPill } from '@/components/app/primitives';

interface InterviewActiveInterfaceProps {
  selectedType: string;
  connectionStatus: string;
  userIsSpeaking: boolean;
  isInterviewActive: boolean;
  transcript: TranscriptEntry[];
  conversation: ReturnType<typeof useConversation>;
  onBack: () => void;
  onStartInterview: () => void;
  onExitInterview: () => void;
  onClearTranscript: () => void;
  timeRemaining?: string;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

const InterviewActiveInterface: React.FC<InterviewActiveInterfaceProps> = ({
  selectedType,
  connectionStatus,
  userIsSpeaking,
  isInterviewActive,
  transcript,
  conversation,
  onBack,
  onStartInterview,
  onExitInterview,
  onClearTranscript,
  timeRemaining,
  isMuted = false,
  onToggleMute
}) => {
  const getInterviewDetails = () => {
    if (selectedType === 'general') {
      return {
        title: 'General AI Interview',
        subtitle: 'Behavioral & Situational Questions',
        icon: Laptop,
      };
    }
    return {
      title: 'Coding AI Interview',
      subtitle: 'Technical & Programming Challenges',
      icon: Code,
    };
  };

  const details = getInterviewDetails();

  const connectionLabel =
    connectionStatus === 'connected' ? 'Connected'
    : connectionStatus === 'error' ? 'Error'
    : connectionStatus === 'connecting' ? 'Connecting…'
    : connectionStatus === 'requesting-mic' ? 'Requesting mic…'
    : connectionStatus === 'fetching-config' ? 'Configuring…'
    : 'Ready';

  const connectionTone =
    connectionStatus === 'connected' ? 'active'
    : connectionStatus === 'error' ? 'warning'
    : 'idle';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Full Screen Header */}
      <div className="border-b border-foreground/[0.06] bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
                Back
              </Button>

              <div className="flex items-center gap-3">
                <IconTile icon={details.icon} />
                <div>
                  <h1 className="font-headline text-xl font-semibold tracking-tight text-foreground">
                    {details.title}
                  </h1>
                  <p className="font-body text-sm text-muted-foreground">{details.subtitle}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isInterviewActive && timeRemaining && (
                <InterviewTimer timeRemaining={timeRemaining} />
              )}
              <StatusPill tone={connectionTone}>{connectionLabel}</StatusPill>
              {userIsSpeaking && <StatusPill tone="live">Speaking…</StatusPill>}
            </div>
          </div>
        </div>
      </div>

      {/* Main Interview Content */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-6">
        <InterviewInterface conversation={conversation} userIsSpeaking={userIsSpeaking} />
        <InterviewStatus isInterviewActive={isInterviewActive} />
        <InterviewControls
          isInterviewActive={isInterviewActive}
          onStartInterview={onStartInterview}
          onExitInterview={onExitInterview}
          isMuted={isMuted}
          onToggleMute={onToggleMute}
        />
        <InterviewTranscript
          transcript={transcript}
          isInterviewActive={isInterviewActive}
          onClearTranscript={onClearTranscript}
        />
      </div>
    </div>
  );
};

export default InterviewActiveInterface;
