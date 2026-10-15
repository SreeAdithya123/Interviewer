import React, { useState, useRef } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, MessagesSquare, User, Mic, Square, Volume2, Loader2, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import RestrictedAccessCard from '@/components/RestrictedAccessCard';
import PageHeader from '@/components/app/PageHeader';
import Reveal from '@/components/marketing/Reveal';
import { StatusPill } from '@/components/app/primitives';

interface PracticeResponse {
  transcript: string;
  aiQuestion: string;
  aiAudio: string;
}

const PracticeInterview: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAudio, setAiAudio] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const { subscription, isLoading: subscriptionLoading, isBeginner } = useSubscription();

  const startRecording = async () => {
    try {
      // If no AI question yet, get one first
      if (!aiQuestion) {
        toast({
          title: "Getting interview question...",
          description: "Please wait while we prepare your interview question.",
        });
        await getNextQuestion();
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processRecording(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast({
        title: "Recording started",
        description: "Speak your answer now...",
      });
    } catch (error) {
      console.error('Recording error:', error);
      toast({
        title: "Error",
        description: "Could not access microphone. Please check permissions and try again.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const processRecording = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const { data, error } = await supabase.functions.invoke('sarvam-practice-interview', {
        body: { audioData: base64Audio }
      });

      if (error) throw error;

      const response: PracticeResponse = data;
      setTranscript(response.transcript);
      setAiQuestion(response.aiQuestion);
      setAiAudio(response.aiAudio);

      toast({
        title: "Processing complete!",
        description: "Your answer has been analyzed. Listen to the AI feedback!",
      });
    } catch (error) {
      console.error('Error processing recording:', error);
      toast({
        title: "Error",
        description: "Failed to process your recording. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const playAiAudio = () => {
    if (aiAudio && !isPlaying) {
      // Create audio from base64
      const audioData = `data:audio/wav;base64,${aiAudio}`;
      const audio = new Audio(audioData);
      audioRef.current = audio;

      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        toast({
          title: "Audio Error",
          description: "Could not play AI response audio.",
          variant: "destructive",
        });
      };

      audio.play();
    }
  };

  const getNextQuestion = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sarvam-practice-interview', {
        body: { getQuestion: true }
      });

      if (error) throw error;

      const response: PracticeResponse = data;
      setAiQuestion(response.aiQuestion);
      setAiAudio(response.aiAudio);
      setTranscript(''); // Clear previous transcript

      toast({
        title: "New question ready!",
        description: "Listen to the AI question and record your answer.",
      });
    } catch (error) {
      console.error('Error getting next question:', error);
      toast({
        title: "Error",
        description: "Failed to get next question. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const endPractice = () => {
    setTranscript('');
    setAiQuestion('');
    setAiAudio(null);
    if (isRecording) {
      stopRecording();
    }
    toast({
      title: "Practice ended",
      description: "Great job! You can start a new practice session anytime.",
    });
  };

  // Show loading state while checking subscription
  if (subscriptionLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-6 py-10 lg:py-14">
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/15 border-t-foreground/60" />
            <p className="font-body text-sm text-muted-foreground">Loading…</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Show restricted access for beginner plan users
  if (isBeginner) {
    return (
      <Layout>
        <RestrictedAccessCard feature="Practice Interview" />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-10 lg:py-14 space-y-12">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-4 text-muted-foreground hover:text-foreground"
            onClick={() => window.history.back()}
          >
            <ArrowLeft strokeWidth={1.75} />
            Back
          </Button>
          <PageHeader
            eyebrow="Practice · Sarvam AI"
            title="Practice Interview"
            actions={<StatusPill>Ready</StatusPill>}
          />
        </div>

        {/* Avatar stage */}
        <Reveal>
          <Card className="rounded-[2rem] shadow-ambient p-8">
            <div className="grid sm:grid-cols-2 gap-8">
              {/* AI Interviewer */}
              <div className="text-center">
                <div
                  className={`size-28 mx-auto rounded-full bg-muted grid place-items-center transition-all duration-300 ease-out-quint ${
                    isPlaying ? 'ring-4 ring-primary/15' : ''
                  }`}
                >
                  <MessagesSquare className="h-10 w-10 text-foreground/60" strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 font-headline text-lg font-semibold tracking-tight text-foreground">
                  AI Interviewer
                </h3>
                <p className="mt-1 font-body text-sm text-muted-foreground">
                  Practice interview assistant
                </p>
                <span className="mt-3 inline-flex items-center gap-2 font-body text-xs text-muted-foreground">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      aiQuestion ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                    }`}
                  />
                  {aiQuestion ? 'Ready to respond' : 'Waiting for question'}
                </span>
              </div>

              {/* Candidate (You) */}
              <div className="text-center">
                <div
                  className={`size-28 mx-auto rounded-full bg-muted grid place-items-center transition-all duration-300 ease-out-quint ${
                    isRecording ? 'ring-4 ring-destructive/20 animate-pulse' : ''
                  }`}
                >
                  <User className="h-10 w-10 text-foreground/60" strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 font-headline text-lg font-semibold tracking-tight text-foreground">
                  Candidate (You)
                </h3>
                <p className="mt-1 font-body text-sm text-muted-foreground">
                  Interview participant
                </p>
                <span className="mt-3 inline-flex items-center gap-2 font-body text-xs text-muted-foreground">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isRecording ? 'bg-destructive animate-pulse' : 'bg-muted-foreground/40'
                    }`}
                  />
                  {isRecording ? 'Recording…' : 'Ready to record'}
                </span>
              </div>
            </div>

            {/* Live Practice Session */}
            {(isRecording || aiQuestion) && (
              <div className="mt-8 flex justify-center">
                <StatusPill tone="live">Live Practice Session</StatusPill>
              </div>
            )}

            {/* Action row */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              {!isRecording && !isProcessing ? (
                <>
                  <Button onClick={getNextQuestion} variant="outline">
                    <MessagesSquare strokeWidth={1.5} />
                    Get AI Question
                  </Button>

                  <Button onClick={startRecording} disabled={isProcessing} size="lg">
                    <Mic strokeWidth={1.5} />
                    {!aiQuestion ? 'Start Interview' : 'Record'}
                  </Button>
                </>
              ) : isRecording ? (
                <Button onClick={stopRecording} size="lg" variant="destructive">
                  <Square strokeWidth={1.5} />
                  Stop
                </Button>
              ) : (
                <div className="flex items-center gap-3 font-body text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                  Processing your response…
                </div>
              )}
            </div>
          </Card>
        </Reveal>

        {/* AI Question */}
        {aiQuestion && (
          <Reveal>
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <MessagesSquare className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                <h3 className="font-headline text-h3 font-semibold tracking-tight text-foreground">
                  AI Interview Question
                </h3>
              </div>

              <div className="bg-primary/[0.04] border border-primary/15 rounded-xl p-4">
                <p className="font-body text-sm leading-body text-foreground whitespace-pre-wrap">
                  {aiQuestion}
                </p>
              </div>

              {aiAudio && (
                <Button
                  onClick={playAiAudio}
                  disabled={isPlaying}
                  variant="secondary"
                  className="w-full"
                >
                  <Volume2 strokeWidth={1.5} />
                  {isPlaying ? 'Playing AI Response…' : 'Listen to Question'}
                </Button>
              )}
            </Card>
          </Reveal>
        )}

        {/* Transcript */}
        {transcript && (
          <Reveal>
            <Card className="p-6 space-y-4">
              <h3 className="font-headline text-h3 font-semibold tracking-tight text-foreground">
                Your Response
              </h3>
              <div className="bg-muted/50 border border-foreground/[0.06] rounded-xl p-4">
                <p className="font-body text-sm leading-body text-foreground whitespace-pre-wrap">
                  {transcript}
                </p>
              </div>
            </Card>
          </Reveal>
        )}

        {/* Instructions */}
        {!aiQuestion && !isRecording && (
          <Reveal>
            <Card className="p-6 text-center">
              <div className="mx-auto max-w-md">
                <h3 className="font-headline text-h3 font-semibold tracking-tight text-foreground">
                  Ready to practice?
                </h3>
                <p className="mt-3 font-body text-sm leading-body text-muted-foreground">
                  Click "Start Interview" to begin your AI-powered interview practice session. We'll
                  generate questions and provide voice feedback.
                </p>
                <p className="mt-4 inline-flex items-center gap-2 font-body text-xs text-muted-foreground">
                  <Lightbulb className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  Tip: click the button above to start immediately
                </p>
              </div>
            </Card>
          </Reveal>
        )}

        {/* End Practice */}
        {(aiQuestion || transcript) && (
          <div className="text-center">
            <Button onClick={endPractice} variant="outline">
              End Practice Session
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PracticeInterview;
