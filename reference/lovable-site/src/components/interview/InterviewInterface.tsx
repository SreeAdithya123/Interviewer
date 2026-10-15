
import React from 'react';
import { MessageSquare, User } from 'lucide-react';
import { StatusPill } from '@/components/app/primitives';

interface InterviewInterfaceProps {
  conversation: {
    isSpeaking: boolean;
    status: string;
  };
  userIsSpeaking?: boolean;
}

const InterviewInterface: React.FC<InterviewInterfaceProps> = ({ conversation, userIsSpeaking = false }) => {
  const isConnected = conversation.status === 'connected';
  const aiIsSpeaking = isConnected && conversation.isSpeaking && !userIsSpeaking;
  const userIsActuallySpeaking = isConnected && userIsSpeaking;

  return (
    <div className="bg-card border border-foreground/[0.06] rounded-2xl p-8 mb-6 shadow-soft">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Interviewer */}
        <div className="bg-muted/40 border border-foreground/[0.06] rounded-xl p-8 flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative mb-6">
            {/* Single soft pulse ring while the interviewer speaks */}
            {aiIsSpeaking && (
              <span className="absolute inset-0 rounded-full ring-2 ring-primary/20 animate-pulse" />
            )}

            <div
              className={`relative flex h-32 w-32 items-center justify-center rounded-full bg-card border border-foreground/[0.06] transition-all duration-300 ease-out-quint ${
                aiIsSpeaking ? 'scale-105' : 'hover:scale-105'
              }`}
            >
              <span className="grid h-24 w-24 place-items-center rounded-full bg-muted">
                <MessageSquare
                  className={`h-11 w-11 transition-colors duration-300 ${
                    aiIsSpeaking ? 'text-primary' : 'text-foreground/60'
                  }`}
                  strokeWidth={1.5}
                />
              </span>
            </div>

            {aiIsSpeaking && (
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 animate-fade-in">
                <StatusPill tone="active">AI speaking</StatusPill>
              </div>
            )}
          </div>

          <h2 className="font-headline text-2xl font-semibold tracking-tight text-foreground mb-2">Vyoman</h2>
          <p className="font-body text-sm text-muted-foreground">Technical Interview Expert</p>
          <div className="mt-4">
            <StatusPill tone={isConnected ? 'active' : 'idle'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </StatusPill>
          </div>
        </div>

        {/* Candidate */}
        <div className="bg-muted/40 border border-foreground/[0.06] rounded-xl p-8 flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative mb-6">
            {userIsActuallySpeaking && (
              <span className="absolute inset-0 rounded-full ring-2 ring-primary/20 animate-pulse" />
            )}

            <div
              className={`relative flex h-32 w-32 items-center justify-center rounded-full bg-card border border-foreground/[0.06] transition-all duration-300 ease-out-quint ${
                userIsActuallySpeaking ? 'scale-105' : 'hover:scale-105'
              }`}
            >
              <span className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-muted">
                <User
                  className={`h-12 w-12 transition-colors duration-300 ${
                    userIsActuallySpeaking ? 'text-primary' : 'text-foreground/60'
                  }`}
                  strokeWidth={1.5}
                />
              </span>
            </div>

            {userIsActuallySpeaking && (
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 animate-fade-in">
                <StatusPill tone="active">You're speaking</StatusPill>
              </div>
            )}
          </div>

          <h2 className="font-headline text-2xl font-semibold tracking-tight text-foreground mb-2">Candidate (You)</h2>
          <p className="font-body text-sm text-muted-foreground">Interview Participant</p>
        </div>
      </div>

      {/* Live conversation indicator */}
      {isConnected && (
        <div className="mt-6 flex justify-center">
          <StatusPill tone="active">Live interview session</StatusPill>
        </div>
      )}
    </div>
  );
};

export default InterviewInterface;
