import React, { useState, useEffect } from 'react';
import { Square, Mic, MicOff, Volume2, VolumeX, Hand, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { StatusPill } from '@/components/app/primitives';
import { ConnectionStatus } from '@/pages/Interviewer';

interface InterviewerControlPanelProps {
  isSessionActive: boolean;
  isStartingInterview?: boolean;
  isMicEnabled: boolean;
  isSpeakerEnabled: boolean;
  isPushToTalk: boolean;
  isPushToTalkActive: boolean;
  sessionStartTime: Date | null;
  questionStartTime: Date | null;
  connectionStatus: ConnectionStatus;
  userPlan: string;
  onStartSession: () => void;
  onStopSession: () => void;
  onToggleMic: () => void;
  onToggleSpeaker: () => void;
  onTogglePushToTalk: () => void;
  onPushToTalkStart: () => void;
  onPushToTalkEnd: () => void;
}

const InterviewerControlPanel: React.FC<InterviewerControlPanelProps> = ({
  isSessionActive,
  isStartingInterview = false,
  isMicEnabled,
  isSpeakerEnabled,
  isPushToTalk,
  isPushToTalkActive,
  sessionStartTime,
  questionStartTime,
  connectionStatus,
  userPlan,
  onStartSession,
  onStopSession,
  onToggleMic,
  onToggleSpeaker,
  onTogglePushToTalk,
  onPushToTalkStart,
  onPushToTalkEnd,
}) => {
  const [sessionTimer, setSessionTimer] = useState('00:00');
  const [questionTimer, setQuestionTimer] = useState('00:00');

  useEffect(() => {
    if (!sessionStartTime) {
      setSessionTimer('00:00');
      return;
    }

    const initialElapsed = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
    const initialMinutes = Math.floor(initialElapsed / 60).toString().padStart(2, '0');
    const initialSeconds = (initialElapsed % 60).toString().padStart(2, '0');
    setSessionTimer(`${initialMinutes}:${initialSeconds}`);

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
      const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const seconds = (elapsed % 60).toString().padStart(2, '0');
      setSessionTimer(`${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStartTime]);

  useEffect(() => {
    if (!questionStartTime) {
      setQuestionTimer('00:00');
      return;
    }

    const initialElapsed = Math.floor((Date.now() - questionStartTime.getTime()) / 1000);
    const initialMinutes = Math.floor(initialElapsed / 60).toString().padStart(2, '0');
    const initialSeconds = (initialElapsed % 60).toString().padStart(2, '0');
    setQuestionTimer(`${initialMinutes}:${initialSeconds}`);

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - questionStartTime.getTime()) / 1000);
      const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const seconds = (elapsed % 60).toString().padStart(2, '0');
      setQuestionTimer(`${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [questionStartTime]);

  const getPlanLabel = () => {
    switch (userPlan) {
      case 'pro':
        return { label: 'Pro', variant: 'default' as const };
      case 'plus':
        return { label: 'Plus', variant: 'default' as const };
      case 'beginner':
        return { label: 'Beginner', variant: 'secondary' as const };
      default:
        return { label: 'Free', variant: 'outline' as const };
    }
  };

  const planInfo = getPlanLabel();

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="font-metric text-[11px] font-semibold uppercase tracking-label text-muted-foreground">
            Session controls
          </CardTitle>
          <Badge variant={planInfo.variant}>{planInfo.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Session control — only End (Start is via setup form) */}
        <div>
          {isSessionActive || sessionStartTime ? (
            <Button onClick={onStopSession} variant="destructive" size="lg" className="w-full">
              <Square className="mr-2 h-4 w-4" strokeWidth={1.5} />
              End session
            </Button>
          ) : isStartingInterview ? (
            <div className="flex items-center justify-center gap-2 py-4 font-body text-sm text-muted-foreground">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Connecting…
            </div>
          ) : null}
        </div>

        <Separator />

        {/* Timers */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Session', value: sessionTimer },
            { label: 'Question', value: questionTimer },
          ].map((t) => (
            <div
              key={t.label}
              className="rounded-xl border border-foreground/[0.06] bg-muted/50 p-3 text-center"
            >
              <div className="mb-1 flex items-center justify-center gap-1.5 font-body text-xs text-muted-foreground">
                <Clock className="h-3 w-3" strokeWidth={1.5} />
                {t.label}
              </div>
              <span className="font-metric text-xl font-semibold text-foreground">{t.value}</span>
            </div>
          ))}
        </div>

        <Separator />

        {/* Audio controls */}
        <div className="space-y-3">
          <h4 className="font-body text-[11px] font-semibold uppercase tracking-label text-muted-foreground/70">
            Audio
          </h4>

          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-foreground/[0.06] bg-muted/40 p-3">
              <div className="flex items-center gap-2.5">
                {isMicEnabled ? (
                  <Mic className="h-4 w-4 text-primary" strokeWidth={1.5} />
                ) : (
                  <MicOff className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                )}
                <Label className="text-sm font-normal">Microphone</Label>
              </div>
              <Switch checked={isMicEnabled} onCheckedChange={onToggleMic} disabled={!isSessionActive} />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-foreground/[0.06] bg-muted/40 p-3">
              <div className="flex items-center gap-2.5">
                {isSpeakerEnabled ? (
                  <Volume2 className="h-4 w-4 text-primary" strokeWidth={1.5} />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                )}
                <Label className="text-sm font-normal">Speaker</Label>
              </div>
              <Switch checked={isSpeakerEnabled} onCheckedChange={onToggleSpeaker} />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-foreground/[0.06] bg-muted/40 p-3">
              <div className="flex items-center gap-2.5">
                <Hand className="h-4 w-4 text-primary" strokeWidth={1.5} />
                <Label className="text-sm font-normal">Push-to-talk</Label>
              </div>
              <Switch checked={isPushToTalk} onCheckedChange={onTogglePushToTalk} />
            </div>
          </div>

          {isPushToTalk && (isSessionActive || sessionStartTime) && (
            <Button
              variant="outline"
              className={`h-16 w-full transition-all ${
                isPushToTalkActive
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : ''
              }`}
              onMouseDown={onPushToTalkStart}
              onMouseUp={onPushToTalkEnd}
              onMouseLeave={onPushToTalkEnd}
              onTouchStart={onPushToTalkStart}
              onTouchEnd={onPushToTalkEnd}
            >
              <Hand className="mr-2 h-5 w-5" strokeWidth={1.5} />
              {isPushToTalkActive ? 'Listening…' : 'Hold to talk'}
            </Button>
          )}
        </div>

        <div className="pt-2">
          <StatusPill tone={connectionStatus.stt === 'connected' ? 'active' : 'neutral'}>
            <span className="font-metric text-[11px] uppercase tracking-label">
              STT {connectionStatus.stt} · TTS {connectionStatus.tts} · {connectionStatus.llm}
            </span>
          </StatusPill>
        </div>
      </CardContent>
    </Card>
  );
};

export default InterviewerControlPanel;
