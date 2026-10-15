import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, LayoutDashboard, LogOut, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconTile, StatusPill } from '@/components/app/primitives';
import { ConnectionStatus } from '@/pages/Interviewer';

interface InterviewerPageHeaderProps {
  isSessionActive: boolean;
  connectionStatus: ConnectionStatus;
  onSignOut: () => void;
}

const InterviewerPageHeader: React.FC<InterviewerPageHeaderProps> = ({
  isSessionActive,
  connectionStatus,
  onSignOut,
}) => {
  const navigate = useNavigate();

  const StatusIcon =
    connectionStatus.stt === 'connected'
      ? Wifi
      : connectionStatus.stt === 'connecting'
        ? Loader2
        : WifiOff;

  return (
    <header className="sticky top-0 z-50 border-b border-foreground/[0.06] bg-card">
      <div className="mx-auto flex max-w-[1800px] items-center justify-between px-6 py-4">
        {/* Wordmark */}
        <div className="flex items-center gap-3.5">
          <IconTile icon={Mic} tone="ink" />
          <div>
            <h1 className="font-headline text-lg font-semibold tracking-tight text-foreground">
              Voice Interviewer
            </h1>
            <p className="font-body text-sm text-muted-foreground">AI-powered interview practice</p>
          </div>
        </div>

        {/* Status readout — one capsule */}
        <div className="hidden items-center gap-2 md:flex">
          {isSessionActive && <StatusPill tone="live">Live</StatusPill>}
          <StatusPill tone={connectionStatus.stt === 'connected' ? 'active' : 'neutral'}>
            <StatusIcon
              className={`h-3 w-3 ${connectionStatus.stt === 'connecting' ? 'animate-spin' : ''}`}
              strokeWidth={1.75}
            />
            <span className="font-metric text-[11px] uppercase tracking-label">
              STT {connectionStatus.stt} · TTS {connectionStatus.tts} · {connectionStatus.llm}
            </span>
          </StatusPill>
        </div>

        {/* Nav */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <LayoutDashboard className="h-4 w-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default InterviewerPageHeader;
