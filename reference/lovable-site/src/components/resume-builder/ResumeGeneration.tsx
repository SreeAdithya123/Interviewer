import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, FileText, Sparkles, Wand2 } from 'lucide-react';

export const ResumeGeneration: React.FC = () => {
  const steps = [
    { icon: FileText, text: 'Analyzing your profile...' },
    { icon: Sparkles, text: 'Enhancing content with AI...' },
    { icon: Wand2, text: 'Optimizing for ATS...' }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        className="w-full max-w-md rounded-[2rem] bg-ink p-10 text-center text-ink-foreground"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-inset ring-white/10">
            <Loader2 className="h-12 w-12 animate-spin text-ink-foreground" />
          </div>
        </div>

        <h2 className="font-headline text-2xl font-semibold text-ink-foreground mb-2">
          Designing your professional resume...
        </h2>
        <p className="font-body text-ink-muted mb-8">
          Our AI is crafting ATS-optimized content tailored to your experience
        </p>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              className="flex items-center gap-3 justify-center text-ink-foreground/80"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.5, duration: 0.4 }}
            >
              <step.icon className="h-5 w-5 text-ink-foreground/70" strokeWidth={1.5} />
              <span>{step.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
