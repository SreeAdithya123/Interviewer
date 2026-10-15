
import React from 'react';
import Layout from '../components/Layout';
import ChatBot from '../components/ChatBot';
import { Building, Briefcase, Star } from 'lucide-react';
import PageHeader from '@/components/app/PageHeader';
import { IconTile } from '@/components/app/primitives';
import Reveal from '@/components/marketing/Reveal';
import { Card, CardContent } from '@/components/ui/card';

const Recruiters = () => {

  const companies = [
    { name: 'Google', industry: 'Technology' },
    { name: 'Microsoft', industry: 'Technology' },
    { name: 'Apple', industry: 'Technology' },
    { name: 'Amazon', industry: 'E-commerce/Cloud' },
    { name: 'Meta', industry: 'Social Media' },
    { name: 'Netflix', industry: 'Entertainment' },
    { name: 'Tesla', industry: 'Automotive/Energy' },
    { name: 'Spotify', industry: 'Music/Tech' }
  ];

  const benefits = [
    {
      icon: Building,
      title: 'Top Companies',
      description: 'Connect with recruiters from Fortune 500 companies'
    },
    {
      icon: Briefcase,
      title: 'Diverse Roles',
      description: 'Opportunities across all industries and experience levels'
    },
    {
      icon: Star,
      title: 'Direct Access',
      description: 'Skip the application queue with direct recruiter contact'
    }
  ];

  return (
    <Layout>
      <div className="mx-auto w-full max-w-6xl px-6 py-14 lg:px-10">
        <Reveal index={0}>
          <PageHeader
            eyebrow="Recruiter access"
            title={<>Talk to <span className="text-spectrum">recruiters</span></>}
          />
        </Reveal>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {/* Left rail */}
          <div className="lg:col-span-1 space-y-8 lg:sticky lg:top-6 self-start">
            <Reveal index={1}>
              <p className="font-metric text-[11px] uppercase tracking-label text-muted-foreground">
                Why Vyoman
              </p>
              <div className="mt-4 space-y-3">
                {benefits.map((benefit, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <IconTile icon={benefit.icon} size="sm" />
                        <h3 className="font-headline text-sm font-semibold text-foreground">
                          {benefit.title}
                        </h3>
                      </div>
                      <p className="mt-2 font-body text-sm leading-body text-muted-foreground">
                        {benefit.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </Reveal>

            <Reveal index={2}>
              <p className="font-metric text-[11px] uppercase tracking-label text-muted-foreground">
                Featured companies
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {companies.map((company, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-foreground/[0.06] bg-card p-3 text-center"
                  >
                    <span className="mx-auto grid h-9 w-9 place-items-center rounded-lg border border-foreground/[0.08] font-headline text-sm font-semibold text-foreground">
                      {company.name[0]}
                    </span>
                    <div className="mt-2 font-body text-sm font-medium text-foreground">
                      {company.name}
                    </div>
                    <div className="font-body text-xs text-muted-foreground">
                      {company.industry}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Right pane */}
          <Reveal index={3} className="lg:col-span-2">
            <ChatBot
              title="YourDream Bot"
              placeholder="Tell me about your dream job..."
              initialMessage="Hey! I'm YourDream Bot. I can help you connect with recruiters from top companies, whether you're eyeing a tech giant, a startup, or a Fortune 500. What kind of role are you looking for?"
              context="recruiter"
            />
          </Reveal>
        </div>
      </div>
    </Layout>
  );
};

export default Recruiters;
