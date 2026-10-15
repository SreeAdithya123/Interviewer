import React from 'react';
import { Briefcase, Layers, Clock, Gauge, Building, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InterviewSettings } from '@/pages/Interviewer';
import { cn } from '@/lib/utils';

interface InterviewSetupFormProps {
  settings: InterviewSettings;
  onSettingsChange: (settings: InterviewSettings) => void;
  onStartInterview: () => void;
  isLoading?: boolean;
}

const ROLES = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Scientist',
  'Product Manager',
  'DevOps Engineer',
  'Mobile Developer',
  'QA Engineer',
  'UI/UX Designer',
  'Data Analyst',
  'Machine Learning Engineer',
  'Cloud Architect',
  'Security Engineer',
  'Other',
];

const INTERVIEW_TYPES: Array<{
  value: InterviewSettings['type'];
  label: string;
  description: string;
}> = [
  { value: 'Behavioral', label: 'Behavioral', description: 'STAR method questions' },
  { value: 'Technical', label: 'Technical', description: 'Coding & system design' },
  { value: 'System Design', label: 'System Design', description: 'Architecture focused' },
  { value: 'Mixed', label: 'Mixed', description: 'Combination of all types' },
];

const DIFFICULTY_LEVELS: Array<{ value: InterviewSettings['difficulty']; label: string }> = [
  { value: 'Easy', label: 'Easy' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Hard', label: 'Hard' },
];

const SectionLabel = ({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: string | number }>;
  children: React.ReactNode;
}) => (
  <div className="mb-5 flex items-center gap-2">
    <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
    <span className="font-metric text-[11px] font-semibold uppercase tracking-label text-muted-foreground">
      {children}
    </span>
  </div>
);

const InterviewSetupForm: React.FC<InterviewSetupFormProps> = ({
  settings,
  onSettingsChange,
  onStartInterview,
  isLoading = false,
}) => {
  const [mockTitle, setMockTitle] = React.useState('');
  const [company, setCompany] = React.useState('');

  const handleTypeChange = (type: InterviewSettings['type']) => {
    onSettingsChange({ ...settings, type });
  };

  const handleDifficultyChange = (difficulty: InterviewSettings['difficulty']) => {
    onSettingsChange({ ...settings, difficulty });
  };

  const handleRoleChange = (role: string) => {
    onSettingsChange({ ...settings, role });
  };

  const handleDurationChange = (value: number[]) => {
    onSettingsChange({ ...settings, duration: value[0] });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="mb-8">
        <span className="eyebrow bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
          <span className="h-1 w-1 rounded-full bg-current" />
          New session
        </span>
        <h1 className="mt-4 font-headline text-h2 font-semibold tracking-headline text-foreground">
          New mock interview
        </h1>
        <p className="mt-2 font-body text-sm text-muted-foreground">
          Configure your settings and get started.
        </p>
      </div>

      {/* Basic Information */}
      <Card className="p-6">
        <SectionLabel icon={Briefcase}>Basic information</SectionLabel>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mock-title" className="text-sm text-muted-foreground">
              Mock title (optional)
            </Label>
            <Input
              id="mock-title"
              placeholder="e.g., Google SWE Practice #1"
              value={mockTitle}
              onChange={(e) => setMockTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm text-muted-foreground">
                Role applying for <span className="text-destructive">*</span>
              </Label>
              <Select value={settings.role} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="text-sm text-muted-foreground">
                Company (optional)
              </Label>
              <div className="relative">
                <Building
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  strokeWidth={1.5}
                />
                <Input
                  id="company"
                  placeholder="e.g., Google, Amazon…"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Interview Type */}
      <Card className="p-6">
        <SectionLabel icon={Layers}>Interview type</SectionLabel>

        <div className="grid grid-cols-2 gap-3">
          {INTERVIEW_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => handleTypeChange(type.value)}
              className={cn(
                'rounded-xl border p-4 text-left transition-all duration-300 ease-out-quint hover:-translate-y-0.5',
                settings.type === type.value
                  ? 'border-primary/40 bg-primary/[0.04] ring-2 ring-primary/30'
                  : 'border-foreground/[0.06] bg-card',
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'grid h-4 w-4 place-items-center rounded-full border',
                    settings.type === type.value ? 'border-primary' : 'border-muted-foreground',
                  )}
                >
                  {settings.type === type.value && (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </span>
                <span className="font-body font-medium text-foreground">{type.label}</span>
              </div>
              <p className="ml-6 mt-1 font-body text-xs text-muted-foreground">{type.description}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Difficulty & Duration */}
      <Card className="p-6">
        <SectionLabel icon={Gauge}>Difficulty & duration</SectionLabel>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Difficulty level</Label>
            <div className="grid grid-cols-3 gap-3">
              {DIFFICULTY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => handleDifficultyChange(level.value)}
                  className={cn(
                    'rounded-xl border px-4 py-3 font-body font-medium transition-all duration-300 ease-out-quint hover:-translate-y-0.5',
                    settings.difficulty === level.value
                      ? 'border-primary/40 bg-primary/[0.04] text-primary ring-2 ring-primary/30'
                      : 'border-foreground/[0.06] bg-muted/40 text-foreground',
                  )}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" strokeWidth={1.5} />
                Duration
              </Label>
              <span className="font-metric text-sm font-semibold text-foreground">
                {settings.duration} min
              </span>
            </div>
            <Slider
              value={[settings.duration]}
              onValueChange={handleDurationChange}
              min={10}
              max={60}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between font-metric text-xs text-muted-foreground">
              <span>10 min</span>
              <span>60 min</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Start Button */}
      <Button
        onClick={onStartInterview}
        disabled={isLoading || !settings.role}
        size="lg"
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />
            Starting interview…
          </>
        ) : (
          'Start interview'
        )}
      </Button>
    </div>
  );
};

export default InterviewSetupForm;
