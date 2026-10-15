import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { Zap, Crown, Star, ArrowUpRight } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { Skeleton } from './ui/skeleton';
import { useNavigate } from 'react-router-dom';
import Reveal from '@/components/marketing/Reveal';

const SubscriptionCard = () => {
  const { subscription, isLoading, planDetails } = useSubscription();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-4" />
          <Skeleton className="h-8 w-24" />
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return null;
  }

  const creditsUsed = subscription.credits_per_month - subscription.credits_remaining;
  const usagePercent = (creditsUsed / subscription.credits_per_month) * 100;

  const getPlanIcon = () => {
    switch (subscription.plan) {
      case 'pro':
        return <Crown className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />;
      case 'plus':
        return <Star className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />;
      case 'free':
        return <Zap className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />;
      default:
        return <Zap className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />;
    }
  };

  const isBeginner = subscription.plan === 'beginner';

  return (
    <Reveal>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 font-metric text-[11px] font-medium uppercase tracking-label text-muted-foreground">
              {getPlanIcon()}
              Your plan
            </CardTitle>
            <Badge variant="outline" className="shrink-0 capitalize">
              {subscription.plan === 'pro' ? (
                <span className="text-spectrum">{planDetails.name}</span>
              ) : (
                planDetails.name
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isBeginner ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-foreground/10 bg-muted/50 p-4">
                <p className="text-sm font-medium text-foreground">
                  You're on the Beginner plan with no interview credits.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Upgrade to Free or higher to start practicing interviews.
                </p>
              </div>
              <Button onClick={() => navigate('/payments')} className="w-full">
                <ArrowUpRight className="mr-2 h-4 w-4" strokeWidth={1.75} />
                Upgrade Plan
              </Button>
            </div>
          ) : (
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Interview Credits</span>
                <span className="font-metric font-semibold text-foreground">
                  {subscription.credits_remaining} / {subscription.credits_per_month}
                </span>
              </div>
              <Progress value={100 - usagePercent} />
              <p className="mt-1 text-xs text-muted-foreground">
                {subscription.credits_remaining} credit{subscription.credits_remaining !== 1 ? 's' : ''} remaining this month
              </p>
            </div>
          )}

          {!isBeginner && subscription.credits_remaining === 0 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-foreground/10 bg-muted/50 p-4">
                <p className="text-sm font-medium text-foreground">
                  No credits remaining. Upgrade your plan to continue practicing.
                </p>
              </div>
              <Button onClick={() => navigate('/payments')} variant="outline" className="w-full">
                <ArrowUpRight className="mr-2 h-4 w-4" strokeWidth={1.75} />
                Upgrade Plan
              </Button>
            </div>
          )}

          {!isBeginner && subscription.credits_remaining > 0 && subscription.plan !== 'pro' && (
            <Button onClick={() => navigate('/payments')} variant="outline" className="w-full">
              <ArrowUpRight className="mr-2 h-4 w-4" strokeWidth={1.75} />
              View Upgrade Options
            </Button>
          )}

          <div className="mt-4 border-t border-foreground/[0.06] pt-4 text-xs text-muted-foreground">
            <p>1 credit = 10 minutes of interview time</p>
            <p className="mt-1">Credits reset monthly</p>
          </div>
        </CardContent>
      </Card>
    </Reveal>
  );
};

export default SubscriptionCard;
