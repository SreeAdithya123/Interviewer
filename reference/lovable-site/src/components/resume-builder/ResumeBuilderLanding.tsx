import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconTile } from '@/components/app/primitives';
import { FileText, Sparkles, Target, Download, Palette, Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Reveal from '@/components/marketing/Reveal';

interface ResumeBuilderLandingProps {
  onStart: () => void;
}

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Content',
    description: 'Intelligent enhancement of your experience and skills'
  },
  {
    icon: Target,
    title: 'ATS Optimized',
    description: 'Designed to pass Applicant Tracking Systems'
  },
  {
    icon: Palette,
    title: 'Premium Templates',
    description: '6 professionally designed resume layouts'
  },
  {
    icon: Download,
    title: 'Instant Download',
    description: 'Export as PDF ready for applications'
  },
  {
    icon: Shield,
    title: 'Recruiter Ready',
    description: 'Formatted for maximum recruiter impact'
  },
  {
    icon: FileText,
    title: 'Easy Editing',
    description: 'Switch templates without regenerating'
  }
];

export const ResumeBuilderLanding: React.FC<ResumeBuilderLandingProps> = ({ onStart }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Back Button */}
      <div className="px-6 pt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back to Dashboard
        </Button>
      </div>

      {/* Hero Section */}
      <Reveal className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6">
          <IconTile icon={FileText} tone="ink" size="lg" className="mx-auto" />
        </div>

        <span className="eyebrow bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
          <span className="h-1 w-1 rounded-full bg-current" />
          Resume builder
        </span>

        <h1 className="font-headline text-display text-foreground mt-6 mb-4 tracking-headline">
          Build Your Resume with
          <span className="text-spectrum"> AI Precision</span>
        </h1>

        <p className="font-body text-body-lg text-muted-foreground max-w-2xl mb-8 leading-body">
          ATS-optimized. Recruiter-ready. Designed to stand out.
        </p>

        <Button
          onClick={onStart}
          size="lg"
          className="px-8 py-6 font-body text-lg font-semibold tracking-button"
        >
          <Sparkles className="mr-2 h-5 w-5" strokeWidth={1.5} />
          Start Building
        </Button>

        <p className="font-body text-sm text-muted-foreground mt-4">
          Takes about 5 minutes • Auto-saves your progress
        </p>
      </Reveal>

      {/* Features Grid */}
      <div className="px-6 pb-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Reveal key={index} index={index}>
              <Card className="p-6 hover:-translate-y-1 hover:shadow-medium transition duration-500 ease-out-quint">
                <IconTile icon={feature.icon} className="mb-4" />
                <h3 className="font-headline text-h3 font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="font-body text-muted-foreground text-sm leading-body">{feature.description}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
};
