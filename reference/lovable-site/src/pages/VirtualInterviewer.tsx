import React, { useState } from 'react';
import { Video, Camera, Mic, MessageCircle, Check } from 'lucide-react';
import Layout from '../components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useHeyGen } from '@/hooks/useHeyGen';
import { useSubscription } from '@/hooks/useSubscription';
import RestrictedAccessCard from '@/components/RestrictedAccessCard';
import PageHeader from '@/components/app/PageHeader';
import Reveal from '@/components/marketing/Reveal';
import { IconTile, StatusPill } from '@/components/app/primitives';

const FEATURES = [
  {
    icon: Camera,
    title: 'Realistic avatar',
    body: "Powered by HeyGen's avatar technology for lifelike expressions and delivery.",
  },
  {
    icon: Mic,
    title: 'Natural speech',
    body: 'High-quality voice synthesis that responds naturally to your conversation.',
  },
  {
    icon: MessageCircle,
    title: 'Interactive chat',
    body: 'Real-time dialogue with intelligent responses tailored to interview scenarios.',
  },
];

const TIPS = [
  'Speak naturally and treat the avatar as a real interviewer.',
  'Type your responses in the chat box for interactive dialogue.',
  "Listen carefully to the avatar's questions and feedback.",
  'Practise maintaining eye contact with the avatar.',
  'Use this as a safe space to build confidence before real interviews.',
];

const VirtualInterviewer = () => {
  const [userInput, setUserInput] = useState('');
  const { isActive, isLoading, startSession, stopSession, speak } = useHeyGen();
  const { subscription, isLoading: subscriptionLoading, isBeginner } = useSubscription();

  const handleStartInterview = async () => {
    try {
      await startSession();

      // Initial greeting from the AI avatar
      setTimeout(() => {
        speak("Hello! I'm your virtual interviewer. I'm here to help you practice your interview skills. What type of position are you interviewing for today?");
      }, 2000);

    } catch (error) {
      console.error('Failed to start interview:', error);
    }
  };

  const handleEndInterview = async () => {
    try {
      await stopSession();
    } catch (error) {
      console.error('Failed to end interview:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || !isActive) return;

    const message = userInput.trim();
    setUserInput('');

    try {
      // Generate a response based on the user's input
      const interviewResponses = [
        `That's interesting. Can you tell me more about your experience with ${message.toLowerCase().includes('experience') ? 'that particular area' : 'similar challenges'}?`,
        `Thank you for sharing that. How do you think this experience has prepared you for this role?`,
        `I see. What would you say is your greatest strength when it comes to ${message.toLowerCase().includes('strength') ? 'problem-solving' : 'teamwork'}?`,
        `That's a good point. Can you give me a specific example of how you've handled a similar situation in the past?`,
        `Excellent. What questions do you have for me about the role or the company?`
      ];

      const randomResponse = interviewResponses[Math.floor(Math.random() * interviewResponses.length)];

      // Make the avatar speak the response
      await speak(randomResponse);

    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Show loading state while checking subscription
  if (subscriptionLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-6 py-10 lg:py-14">
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
        <RestrictedAccessCard feature="Virtual Interviewer" />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-10 lg:py-14 space-y-14">
        <PageHeader
          eyebrow="Avatar mode"
          title="Virtual Interviewer"
          subtitle="Practice with a HeyGen-powered AI avatar that speaks naturally and gives interactive feedback in real time."
          back={{ to: '/dashboard', label: 'Back to Dashboard' }}
          actions={<StatusPill>HeyGen</StatusPill>}
        />

        {/* Main stage */}
        <Reveal>
          <Card className="rounded-[2rem] border-foreground/[0.06] shadow-ambient p-8 lg:p-10">
            <div className="text-center">
              <h2 className="font-headline text-h3 font-semibold tracking-tight text-foreground">
                Practice with the AI avatar interviewer
              </h2>
              <p className="mt-3 mx-auto max-w-2xl font-body text-sm leading-body text-muted-foreground">
                Experience realistic interview practice with a HeyGen-powered avatar that speaks
                naturally and provides interactive feedback in real time.
              </p>
            </div>

            {/* Avatar frame */}
            <div className="mt-8 flex min-h-[400px] items-center justify-center rounded-2xl bg-ink p-8 text-ink-foreground">
              {!isActive ? (
                <div className="text-center">
                  <Video className="mx-auto h-16 w-16 text-ink-muted" strokeWidth={1.5} />
                  <h3 className="mt-4 font-headline text-lg font-semibold">AI avatar ready</h3>
                  <p className="mt-2 font-body text-sm text-ink-muted">
                    Start the interview to begin your session with the HeyGen avatar.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 font-body text-xs text-ink-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-ink-foreground/40" />
                    HeyGen avatar initialised
                  </span>
                </div>
              ) : (
                <div className="w-full max-w-md text-center">
                  <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-ink-foreground/10 ring-1 ring-ink-foreground/20 animate-pulse">
                    <Video className="h-10 w-10 text-ink-muted" strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-4 font-headline text-lg font-semibold">AI avatar active</h3>
                  <p className="mt-2 font-body text-sm text-ink-muted">
                    Your virtual interviewer is ready to interact.
                  </p>

                  {/* Chat row */}
                  <div className="mt-4 flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Type your response or question..."
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1"
                      disabled={isLoading}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!userInput.trim() || isLoading}
                      size="icon"
                    >
                      <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
                    </Button>
                  </div>
                  <p className="mt-2 font-body text-xs text-ink-muted">
                    Type your response and the avatar will reply naturally.
                  </p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="mt-8 flex items-center justify-center gap-4">
              {!isActive ? (
                <Button onClick={handleStartInterview} disabled={isLoading} size="lg">
                  <Video className="h-5 w-5" strokeWidth={1.5} />
                  {isLoading ? 'Starting…' : 'Start Interview'}
                </Button>
              ) : (
                <>
                  <StatusPill tone="active">Avatar active</StatusPill>
                  <Button
                    onClick={handleEndInterview}
                    disabled={isLoading}
                    variant="destructive"
                    size="lg"
                  >
                    <Video className="h-5 w-5" strokeWidth={1.5} />
                    {isLoading ? 'Ending…' : 'End Interview'}
                  </Button>
                </>
              )}
            </div>
          </Card>
        </Reveal>

        {/* Feature grid */}
        <div className="grid md:grid-cols-3 gap-5">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} index={index} step={0.06}>
              <Card className="p-6">
                <IconTile icon={feature.icon} />
                <h3 className="mt-4 font-headline text-h3 font-semibold tracking-tight text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 font-body text-sm leading-body text-muted-foreground">
                  {feature.body}
                </p>
              </Card>
            </Reveal>
          ))}
        </div>

        {/* Tips */}
        <Reveal>
          <Card className="bg-muted/50 p-6">
            <h3 className="font-headline text-h3 font-semibold tracking-tight text-foreground">
              Avatar interview tips
            </h3>
            <ul className="mt-4 space-y-2.5">
              {TIPS.map((tip) => (
                <li
                  key={tip}
                  className="flex items-start gap-2.5 font-body text-sm text-muted-foreground"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground/50" strokeWidth={1.5} />
                  {tip}
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>
      </div>
    </Layout>
  );
};

export default VirtualInterviewer;
