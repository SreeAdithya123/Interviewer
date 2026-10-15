import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, Star, Zap, Crown, Clock, Users, Mail, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription, PLAN_DETAILS, SubscriptionPlan } from '@/hooks/useSubscription';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/app/PageHeader';
import { IconTile } from '@/components/app/primitives';
import Reveal from '@/components/marketing/Reveal';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Payments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription, refetch } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const plans = [
    {
      id: 'free' as SubscriptionPlan,
      name: "Free",
      price: "0",
      period: "month",
      currency: "₹",
      description: "Demo plan for marketing & conversions",
      features: [
        "1 mock interview (10 min)",
        "AI questions & live transcript",
        "Basic evaluation",
        "Resume Builder (1 basic template)",
        "Resume Scanner (1 scan/month)",
        "CareerBot (10 messages/day)",
        "Material Generator (3/month)",
      ],
      buttonText: "Start Free",
      popular: false,
      icon: Clock,
      highlight: "Free Demo"
    },
    {
      id: 'beginner' as SubscriptionPlan,
      name: "Basic",
      price: "199",
      period: "month",
      currency: "₹",
      description: "Best for students starting their journey",
      features: [
        "3 mocks/month (10 min each)",
        "AI questions, transcript & evaluation",
        "PDF export (1-page summary)",
        "Resume Builder (full + PDF export)",
        "Resume Scanner (5 scans + suggestions)",
        "CareerBot (200 messages/month)",
        "YourDream Bot (50 messages/month)",
        "Material Generator (10/month)",
      ],
      buttonText: "Get Basic",
      popular: false,
      icon: Clock,
      highlight: "Best for Students"
    },
    {
      id: 'plus' as SubscriptionPlan,
      name: "Plus",
      price: "399",
      period: "month",
      currency: "₹",
      description: "For serious job seekers",
      features: [
        "6 mocks/month (10-15 min)",
        "Follow-up questions & detailed evaluation",
        "Full PDF report + session compare (2)",
        "Resume Builder (premium templates)",
        "Resume Scanner (15 scans + optimization)",
        "CareerBot (600 messages/month)",
        "YourDream Bot (300 messages/month)",
        "Cold email/DM drafting",
        "Material Generator (30/month)",
        "Role-based Q bank + answers",
      ],
      buttonText: "Upgrade to Plus",
      popular: false,
      icon: Star,
      highlight: "Serious Job Seekers"
    },
    {
      id: 'pro' as SubscriptionPlan,
      name: "Pro",
      price: "599",
      period: "month",
      currency: "₹",
      description: "For high intent users who want it all",
      features: [
        "15 mocks/month (up to 30 min)",
        "Best AI model (Groq) + strong evaluation",
        "Multi-page PDF + session compare (4)",
        "All premium resume templates",
        "Unlimited resume scans (fair-use)",
        "AI rewrite per job description",
        "ATS keyword matching",
        "Unlimited CareerBot (fair-use)",
        "Unlimited YourDream Bot (fair-use)",
        "Offer negotiation assistant",
        "Unlimited materials + weekly roadmap",
        "Priority support",
      ],
      buttonText: "Upgrade to Pro",
      popular: true,
      icon: Crown,
      highlight: "Best Value"
    }
  ];

  const handleSelectPlan = async (planId: SubscriptionPlan) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Free plan - no payment needed
    if (planId === 'free') {
      toast.info('You are already on the free plan or can explore without payment.');
      return;
    }

    setIsProcessing(true);
    setProcessingPlan(planId);

    try {
      // Create order via edge function
      const { data: orderData, error: orderError } = await supabase.functions.invoke('razorpay-create-order', {
        body: { plan: planId }
      });

      if (orderError || !orderData) {
        console.error('Order creation error:', orderError);
        toast.error('Failed to create payment order. Please try again.');
        return;
      }

      console.log('Order created:', orderData);

      // Open Razorpay checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Vyoman',
        description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan - ${orderData.credits} Credits`,
        order_id: orderData.orderId,
        prefill: {
          email: orderData.userEmail || '',
          name: orderData.userName || '',
        },
        theme: {
          color: '#4F46E5',
        },
        handler: async function (response: any) {
          console.log('Payment successful:', response);

          // Verify payment
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('razorpay-verify-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: planId,
              }
            });

            if (verifyError || !verifyData?.success) {
              console.error('Payment verification error:', verifyError);
              toast.error('Payment verification failed. Please contact support.');
              return;
            }

            toast.success(`Successfully upgraded to ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan!`);

            // Refetch subscription data
            if (refetch) {
              refetch();
            }

            // Navigate to dashboard
            navigate('/dashboard');
          } catch (error) {
            console.error('Verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: function() {
            console.log('Payment modal closed');
            setIsProcessing(false);
            setProcessingPlan(null);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);
        toast.error(`Payment failed: ${response.error.description}`);
        setIsProcessing(false);
        setProcessingPlan(null);
      });

      razorpay.open();

    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingPlan(null);
    }
  };

  const isCurrentPlan = (planId: SubscriptionPlan) => {
    return subscription?.plan === planId;
  };

  const isPlanDowngrade = (planId: SubscriptionPlan) => {
    const planOrder = { free: 0, beginner: 1, plus: 2, pro: 3 };
    const currentPlanOrder = planOrder[subscription?.plan || 'free'];
    const targetPlanOrder = planOrder[planId];
    return targetPlanOrder < currentPlanOrder;
  };

  const trustItems = [
    { icon: Clock, title: 'Instant access', body: 'Start practicing immediately after signup' },
    { icon: Zap, title: 'No setup required', body: 'Works in any browser, no downloads needed' },
    { icon: Users, title: 'Expert support', body: 'Get help from our interview specialists' },
  ];

  const content = (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-6 py-14">
        <PageHeader
          eyebrow="Pricing"
          title={<>Choose your <span className="text-spectrum">plan</span></>}
          back={{ onClick: () => navigate(-1), label: 'Back' }}
        />

        <Reveal index={1} className="mt-8 flex flex-col gap-3">
          {subscription && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-foreground/[0.06] bg-muted/50 px-4 py-2.5">
              <span className="font-body text-sm text-muted-foreground">Current plan</span>
              <span className="font-body text-sm font-medium capitalize text-foreground">{subscription.plan}</span>
              <span className="h-3 w-px bg-foreground/15" />
              <span className="font-metric text-sm text-foreground">{subscription.credits_remaining}</span>
              <span className="font-body text-sm text-muted-foreground">credits remaining</span>
            </div>
          )}
          <p className="font-body text-sm text-muted-foreground">
            1 credit = <span className="font-metric">15</span> minutes of interview time
            <span className="mx-2 text-foreground/30">·</span>
            Trusted by <span className="font-metric">50,000+</span> job seekers
          </p>
        </Reveal>

        {/* Pricing Cards */}
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan, index) => (
            <Reveal key={plan.name} index={index} className="relative">
              {isCurrentPlan(plan.id) && (
                <div className="absolute -top-3 right-4 z-10">
                  <Badge>Current plan</Badge>
                </div>
              )}

              <div className="h-full transition-transform duration-500 ease-out-quint hover:-translate-y-1">
                <Card
                  className={cn(
                    'flex h-full flex-col overflow-hidden',
                    plan.popular && 'ring-1 ring-primary/25 shadow-medium',
                  )}
                >
                  {plan.popular && (
                    <div className="bg-ink px-6 py-2 text-center font-metric text-[10px] uppercase tracking-label text-ink-foreground">
                      Best Value
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-6">
                    <IconTile icon={plan.icon} tone={plan.popular ? 'ink' : 'muted'} />

                    <h3 className="mt-4 font-headline text-xl font-semibold text-foreground">
                      {plan.name}
                    </h3>
                    <p className="mt-2 font-body text-sm text-primary">{plan.highlight}</p>

                    <div className="mt-5 flex items-baseline gap-1">
                      <span className="font-metric text-4xl font-semibold text-foreground">
                        {plan.currency}{plan.price}
                      </span>
                      <span className="font-body text-sm text-muted-foreground">/{plan.period}</span>
                    </div>

                    <p className="mt-3 font-body text-sm leading-body text-muted-foreground">
                      {plan.description}
                    </p>

                    <ul className="mt-6 space-y-3">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-3">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
                          <span className="font-body text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => handleSelectPlan(plan.id)}
                      variant={plan.popular ? 'default' : 'outline'}
                      disabled={isCurrentPlan(plan.id) || (isProcessing && processingPlan === plan.id)}
                      className="mt-6 w-full"
                    >
                      {isProcessing && processingPlan === plan.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
                          Processing...
                        </>
                      ) : isCurrentPlan(plan.id)
                        ? 'Current Plan'
                        : isPlanDowngrade(plan.id)
                          ? 'Contact to Downgrade'
                          : plan.buttonText}
                    </Button>
                  </div>
                </Card>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Contact Section */}
        <Reveal index={2} className="mx-auto mt-14 max-w-3xl">
          <Card className="p-8 text-center">
            <IconTile icon={Mail} tone="muted" className="mx-auto" />
            <h3 className="mt-4 font-headline text-lg font-semibold text-foreground">
              Need help choosing?
            </h3>
            <p className="mx-auto mt-2 max-w-md font-body text-sm leading-body text-muted-foreground">
              Contact our team to discuss which plan is right for you or to request a custom enterprise solution.
            </p>
            <Button
              variant="outline"
              onClick={() => (window.location.href = 'mailto:support@vyoman.com?subject=Plan Inquiry')}
              className="mt-5"
            >
              <Mail className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Contact Sales
            </Button>
          </Card>
        </Reveal>

        {/* Trust indicators */}
        <Reveal index={3} className="mt-14">
          <p className="font-metric text-[11px] uppercase tracking-label text-muted-foreground">
            Why Vyoman
          </p>
          <div className="mt-4 grid divide-y divide-foreground/[0.06] rounded-2xl border border-foreground/[0.06] bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {trustItems.map((item) => (
              <div key={item.title} className="flex flex-col items-center gap-3 p-6 text-center">
                <IconTile icon={item.icon} tone="muted" />
                <h4 className="font-headline text-sm font-semibold text-foreground">{item.title}</h4>
                <p className="font-body text-sm leading-body text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </div>
  );

  // If user is logged in, wrap with Layout (sidebar), otherwise show standalone
  if (user) {
    return <Layout>{content}</Layout>;
  }

  return content;
};

export default Payments;
