import React from 'react';
import { Lock, Check, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Reveal from '@/components/marketing/Reveal';

interface RestrictedAccessCardProps {
  feature: string;
}

const BENEFITS = [
  'Access to Virtual Interviewer',
  'Unlimited practice sessions',
  'AI-powered feedback',
  'Priority support',
];

const RestrictedAccessCard: React.FC<RestrictedAccessCardProps> = ({ feature }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <Reveal className="w-full max-w-md">
        <div className="rounded-[1.75rem] bg-ink text-ink-foreground p-8 sm:p-10 shadow-ambient-lg">
          <div className="h-12 w-12 rounded-2xl bg-ink-foreground/10 grid place-items-center">
            <Lock className="h-6 w-6" strokeWidth={1.5} />
          </div>

          <h2 className="mt-6 font-headline text-2xl font-semibold tracking-tight">
            Restricted Access
          </h2>

          <p className="mt-3 font-body text-sm leading-body text-ink-muted">
            <span className="text-spectrum">{feature}</span> is available for Plus and Pro
            plan subscribers. Upgrade your plan to unlock this premium feature and enhance
            your interview preparation.
          </p>

          <ul className="mt-6 space-y-2.5">
            {BENEFITS.map((benefit) => (
              <li
                key={benefit}
                className="flex items-start gap-2.5 font-body text-sm text-ink-foreground/85"
              >
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0 text-ink-foreground/60"
                  strokeWidth={1.5}
                />
                {benefit}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3">
            <Button
              onClick={() => navigate('/payments')}
              size="lg"
              className="w-full bg-ink-foreground text-ink hover:bg-ink-foreground/90"
            >
              Upgrade Plan
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.75} />
            </Button>

            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="w-full border-ink-foreground/20 text-ink-foreground hover:bg-white/[0.06]"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </Reveal>
    </div>
  );
};

export default RestrictedAccessCard;
