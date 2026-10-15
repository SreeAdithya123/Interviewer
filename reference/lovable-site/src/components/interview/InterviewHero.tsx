import React from 'react';
import { Sparkles, Target, Zap } from 'lucide-react';

const InterviewHero: React.FC = () => {
  const features = [
    {
      icon: Sparkles,
      title: 'AI-powered scenarios',
      description: 'Advanced conversational AI runs realistic, adaptive interview sessions.',
    },
    {
      icon: Target,
      title: 'Real-time feedback',
      description: 'Instant read on your responses, delivery, and pacing as you speak.',
    },
    {
      icon: Zap,
      title: 'Performance analytics',
      description: 'Track progress across sessions with detailed scoring and insights.',
    },
  ];

  return (
    <div className="rounded-[2rem] bg-ink text-ink-foreground p-10">
      <h2 className="font-headline text-h3 font-semibold tracking-tight">
        Choose your interview experience
      </h2>
      <p className="mt-2 max-w-xl font-body text-sm leading-body text-ink-muted">
        Practice with a system built to help you succeed — real-time feedback,
        personalised questions, and detailed analytics after every session.
      </p>

      <div className="mt-8 divide-y divide-ink-foreground/10 border-t border-ink-foreground/10">
        {features.map((feature) => (
          <div key={feature.title} className="flex items-start gap-4 py-5 first:pt-6">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-foreground/10">
              <feature.icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </span>
            <div>
              <h3 className="font-headline text-base font-semibold tracking-tight">
                {feature.title}
              </h3>
              <p className="mt-1 font-body text-sm leading-body text-ink-muted">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InterviewHero;
