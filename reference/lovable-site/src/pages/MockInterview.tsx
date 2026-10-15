
import React, { useState } from 'react';
import { useConversation } from '@11labs/react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { processInterviewEnd } from '@/services/interviewSessionService';
import Layout from '../components/Layout';
import InterviewInterface from '../components/interview/InterviewInterface';
import InterviewTranscript from '../components/interview/InterviewTranscript';
import { Users, Target, BookOpen, ArrowUpRight } from 'lucide-react';
import PageHeader from '@/components/app/PageHeader';
import Reveal from '@/components/marketing/Reveal';
import { IconTile, StatusPill } from '@/components/app/primitives';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface TranscriptEntry {
  speaker: 'AI' | 'User';
  text: string;
  timestamp: string;
}

const MockInterview = () => {
  const [completedInterviews, setCompletedInterviews] = useState<Array<{
    id: string;
    type: string;
    date: string;
    duration: string;
    status: string;
  }>>([]);
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [showMockInterface, setShowMockInterface] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [interviewStartTime, setInterviewStartTime] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const conversation = useConversation({
    onConnect: () => {
      console.log('✅ Successfully connected to ElevenLabs Conversational AI');
      setIsInterviewActive(true);
      setConnectionStatus('connected');
      toast({
        title: "Mock Interview Started",
        description: "Connected to AI interviewer successfully",
      });
    },
    onDisconnect: () => {
      console.log('🔌 Disconnected from ElevenLabs Conversational AI');
      setIsInterviewActive(false);
      setConnectionStatus('disconnected');
      toast({
        title: "Mock Interview Ended",
        description: "Disconnected from AI interviewer",
      });
    },
    onMessage: (message) => {
      console.log('📨 Message received:', message);
      const currentTime = new Date().toLocaleTimeString();

      if (message.source === 'ai') {
        console.log('🤖 AI message:', message.message);
        setTranscript(prev => [...prev, {
          speaker: 'AI',
          text: message.message,
          timestamp: currentTime
        }]);
      } else if (message.source === 'user') {
        console.log('👤 User message:', message.message);
        setTranscript(prev => [...prev, {
          speaker: 'User',
          text: message.message,
          timestamp: currentTime
        }]);
      }
    },
    onError: (error) => {
      console.error('❌ ElevenLabs Conversation error:', error);
      setIsInterviewActive(false);
      setConnectionStatus('error');

      let errorMessage = 'Unknown error';
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        const errorObj = error as any;
        if (errorObj.message && typeof errorObj.message === 'string') {
          errorMessage = errorObj.message;
        } else if (errorObj.reason && typeof errorObj.reason === 'string') {
          errorMessage = errorObj.reason;
        } else {
          errorMessage = String(error);
        }
      }

      toast({
        title: "Mock Interview Error",
        description: `Connection error: ${errorMessage}`,
        variant: "destructive",
      });
    }
  });

  const handleStartMockInterview = async () => {
    try {
      console.log('🎤 Requesting microphone access...');
      setConnectionStatus('requesting-mic');
      setShowMockInterface(true);

      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone access granted');

      setConnectionStatus('fetching-config');
      console.log('🔧 Fetching ElevenLabs configuration...');

      const { data, error } = await supabase.functions.invoke('get-elevenlabs-signed-url');

      if (error) {
        console.error('❌ Configuration error:', error);
        throw new Error(`Configuration error: ${error.message}`);
      }

      if (!data || !data.signedUrl) {
        console.error('❌ No signed URL received:', data);
        throw new Error('Failed to get ElevenLabs signed URL for authentication');
      }

      console.log('✅ Signed URL received for authenticated connection');
      setConnectionStatus('connecting');

      console.log('🚀 Starting authenticated session with signed URL');

      const { data: configData, error: configError } = await supabase.functions.invoke('get-elevenlabs-config');

      if (configError || !configData?.agentId) {
        console.error('❌ Failed to get agent ID:', configError);
        throw new Error('Failed to get agent configuration');
      }

      const conversationId = await conversation.startSession({
        signedUrl: data.signedUrl,
        connectionType: 'websocket',
      });

      console.log('✅ Mock Interview started with conversation ID:', conversationId);
      setConnectionStatus('connected');

    } catch (error) {
      console.error('❌ Error starting mock interview:', error);
      setIsInterviewActive(false);
      setConnectionStatus('error');
      setShowMockInterface(false);

      const err = error as Error;
      if (err.name === 'NotAllowedError') {
        toast({
          title: "Microphone Access Required",
          description: "Please allow microphone access to start the interview.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Connection Error",
          description: `Failed to connect: ${err.message || 'Unknown error'}`,
          variant: "destructive",
        });
      }
    }
  };

  const handleExitInterview = async () => {
    try {
      console.log('🛑 Ending mock interview session...');
      await conversation.endSession();

      const currentTime = new Date().toLocaleTimeString();
      setTranscript(prev => [...prev, {
        speaker: 'AI',
        text: 'Thank you for participating in the mock interview. Good luck with your future interviews!',
        timestamp: currentTime
      }]);

      console.log('✅ Mock Interview ended successfully');

      // Simulate saving the interview
      const newInterview = {
        id: Date.now().toString(),
        type: 'Mock Interview',
        date: new Date().toLocaleDateString(),
        duration: '20-45 min',
        status: 'Completed'
      };
      setCompletedInterviews(prev => [newInterview, ...prev]);
      setShowMockInterface(false);

    } catch (error) {
      console.error('❌ Error ending mock interview:', error);
      setIsInterviewActive(false);
      setConnectionStatus('disconnected');
      setShowMockInterface(false);
    }
  };

  const handleClearTranscript = () => {
    setTranscript([]);
  };

  const actionButtons = [
    {
      title: 'Start Job Readiness Assessment',
      description: 'Evaluate your current interview skills',
      icon: Target,
      action: null,
    },
    {
      title: 'Start Mock Interview',
      description: 'Practice with AI interviewer',
      icon: Users,
      badge: 'Beta',
      action: handleStartMockInterview,
    },
    {
      title: 'Start Practicing Questions',
      description: 'Drill common interview questions',
      icon: BookOpen,
      action: null,
    }
  ];

  // Show interview interface when mock interview is active
  if (showMockInterface) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-6 py-10 lg:py-14 space-y-14">
          <PageHeader
            eyebrow="Practice"
            title={<>AI Mock <span className="text-spectrum">Interview</span></>}
            actions={<StatusPill>{connectionStatus}</StatusPill>}
          />

          <div className="space-y-8">
            <InterviewInterface conversation={conversation} />

            {/* Mock Interview Status */}
            {isInterviewActive && (
              <Card className="p-6 text-center">
                <StatusPill tone="active">Mock Interview active</StatusPill>
                <p className="mt-3 font-body text-sm leading-body text-muted-foreground">
                  Answer questions naturally. The AI will provide feedback on your responses.
                </p>
              </Card>
            )}

            {/* Session controls */}
            <div className="flex flex-col items-center gap-4">
              {!isInterviewActive ? (
                <Button size="lg" onClick={handleStartMockInterview}>
                  <Users className="h-5 w-5" strokeWidth={1.5} />
                  Start Mock Interview
                </Button>
              ) : (
                <>
                  <StatusPill tone="warning">Mock Interview in Progress</StatusPill>
                  <Button size="lg" variant="destructive" onClick={handleExitInterview}>
                    <Users className="h-5 w-5" strokeWidth={1.5} />
                    End Interview
                  </Button>
                </>
              )}
            </div>

            <InterviewTranscript
              transcript={transcript}
              isInterviewActive={isInterviewActive}
              onClearTranscript={handleClearTranscript}
            />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-10 lg:py-14 space-y-14">
        <PageHeader
          eyebrow="Practice"
          title={<>AI Mock <span className="text-spectrum">Interview</span></>}
        />

        {/* Action cards */}
        <Reveal>
          <div className="grid md:grid-cols-3 gap-5">
            {actionButtons.map((button, index) => (
              <Card
                key={index}
                onClick={button.action || undefined}
                className={`p-6 hover:-translate-y-1 transition-transform duration-500 ease-out-quint ${
                  button.action ? 'cursor-pointer' : 'opacity-60 pointer-events-none'
                }`}
              >
                <IconTile icon={button.icon} />
                <div className="mt-4 flex items-start justify-between gap-3">
                  <h3 className="font-headline text-h3 font-semibold tracking-tight text-foreground">
                    {button.title}
                  </h3>
                  {button.badge && <Badge variant="secondary">{button.badge}</Badge>}
                </div>
                <p className="mt-2 font-body text-sm leading-body text-muted-foreground">
                  {button.description}
                </p>

                {button.action && (
                  <div className="mt-4 flex items-center gap-1.5 font-body text-sm font-medium text-primary">
                    <span>Start now</span>
                    <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                )}
              </Card>
            ))}
          </div>
        </Reveal>

        {/* Sessions panel */}
        <Reveal>
          <Card>
            <CardHeader className="flex flex-col gap-3 border-b border-foreground/[0.06] sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <h2 className="font-metric text-[11px] uppercase tracking-label text-muted-foreground">
                Past Sessions
              </h2>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>

            {completedInterviews.length > 0 ? (
              <div className="divide-y divide-foreground/[0.06]">
                {completedInterviews.map((interview) => (
                  <div key={interview.id} className="flex items-center justify-between px-6 py-4">
                    <div className="min-w-0">
                      <h3 className="font-body font-medium text-foreground">{interview.type}</h3>
                      <p className="mt-0.5 font-metric text-xs text-muted-foreground">
                        {interview.date} · {interview.duration}
                      </p>
                    </div>
                    <StatusPill tone="active">{interview.status}</StatusPill>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <IconTile icon={Users} size="lg" />
                <h3 className="mt-5 font-headline text-lg font-semibold tracking-headline text-foreground">
                  No mock interview sessions yet
                </h3>
                <p className="mt-2 max-w-sm font-body text-sm leading-body text-muted-foreground">
                  Start your first mock interview to practice and improve your skills.
                </p>
                <Button className="mt-6" onClick={handleStartMockInterview}>
                  Start Mock Interview
                </Button>
              </div>
            )}
          </Card>
        </Reveal>
      </div>
    </Layout>
  );
};

export default MockInterview;
