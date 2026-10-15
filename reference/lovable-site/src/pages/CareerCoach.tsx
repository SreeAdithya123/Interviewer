
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ChatBot from '../components/ChatBot';
import ProtectedRoute from '../components/ProtectedRoute';
import { Star, Target, TrendingUp, Award, Settings, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconTile } from '@/components/app/primitives';
import Reveal from '@/components/marketing/Reveal';

const CareerCoach = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();


  const features = [
    {
      icon: Target,
      title: 'Goal Setting',
      description: 'Define and achieve your career objectives'
    },
    {
      icon: TrendingUp,
      title: 'Skill Development',
      description: 'Identify and develop in-demand skills'
    },
    {
      icon: Award,
      title: 'Career Growth',
      description: 'Strategic advice for career advancement'
    }
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <ProtectedRoute>
      <Layout>
        {/* Slim identity bar */}
        <div className="border-b border-foreground/[0.06] bg-card">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="-ml-2 text-muted-foreground"
              >
                <ArrowLeft strokeWidth={1.75} />
                Back
              </Button>
              <span className="h-5 w-px bg-foreground/10" />
              <div className="flex items-center gap-2.5">
                <IconTile icon={Star} tone="ink" size="sm" />
                <span className="font-headline text-lg font-semibold tracking-headline text-foreground">
                  CareerBot
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
                <Settings strokeWidth={1.5} />
                Settings
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mx-auto max-w-6xl px-6 py-10 lg:py-14">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.4fr]">
            {/* Left — how it helps */}
            <div className="space-y-5">
              <Reveal index={0}>
                <span className="eyebrow bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
                  <span className="h-1 w-1 rounded-full bg-current" />
                  AI career coach
                </span>
                <h2 className="mt-4 font-headline text-h2 tracking-headline text-foreground">
                  How I can <span className="text-spectrum">help</span>
                </h2>
                <p className="mt-2 max-w-md font-body text-sm leading-body text-muted-foreground">
                  Personalized guidance for every step of your career — from setting goals to
                  landing the next role.
                </p>
              </Reveal>

              {features.map((feature, i) => (
                <Reveal key={feature.title} index={i + 1}>
                  <Card className="p-6 hover:-translate-y-1 transition-transform duration-500 ease-out-quint">
                    <div className="flex items-center gap-3">
                      <IconTile icon={feature.icon} />
                      <h3 className="font-headline text-base font-semibold tracking-tight text-foreground">
                        {feature.title}
                      </h3>
                    </div>
                    <p className="mt-3 font-body text-sm leading-body text-muted-foreground">
                      {feature.description}
                    </p>
                  </Card>
                </Reveal>
              ))}
            </div>

            {/* Right — chat */}
            <div>
              <ChatBot
                title="CareerBot"
                placeholder="Ask me anything about your career..."
                initialMessage="Hey there! I'm CareerBot. I'm here to help you with your career, whether it's skill development, interview prep, resume tips, or career planning. What's on your mind?"
                context="career"
              />
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default CareerCoach;
