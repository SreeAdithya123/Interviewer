import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Eye } from 'lucide-react';
import type { TemplateId } from '@/types/resume';
import Reveal from '@/components/marketing/Reveal';

interface TemplateGalleryProps {
  selectedTemplate: TemplateId;
  onSelectTemplate: (template: TemplateId) => void;
  onProceed: () => void;
}

const templates: { id: TemplateId; name: string; description: string }[] = [
  {
    id: 'modern-corporate',
    name: 'Modern Corporate',
    description: 'Clean, professional design for corporate roles'
  },
  {
    id: 'minimal-professional',
    name: 'Minimal Professional',
    description: 'Elegant simplicity with focus on content'
  },
  {
    id: 'creative-designer',
    name: 'Creative Designer',
    description: 'Bold layout for creative professionals'
  },
  {
    id: 'academic-overleaf',
    name: 'Academic Overleaf',
    description: 'LaTeX-inspired scholarly style'
  }
];

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  selectedTemplate,
  onSelectTemplate,
  onProceed
}) => {
  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-12">
          <h1 className="font-headline text-h2 font-semibold tracking-headline text-foreground mb-2">
            Choose Your Template
          </h1>
          <p className="font-body text-muted-foreground">
            Select a design that best represents your professional style
          </p>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
          {templates.map((template, index) => (
            <Reveal key={template.id} index={index}>
              <Card
                className={`relative cursor-pointer overflow-hidden ${
                  selectedTemplate === template.id
                    ? 'ring-4 ring-primary/15 border-primary/40'
                    : 'hover:shadow-medium hover:-translate-y-1'
                }`}
                onClick={() => onSelectTemplate(template.id)}
              >
                {/* Template Preview */}
                <div className="h-48 bg-muted/60 p-4">
                  <div className="bg-card rounded-lg h-full p-3 text-left">
                    <div className="h-3 w-24 bg-foreground/80 rounded mb-2" />
                    <div className="h-2 w-16 bg-foreground/40 rounded mb-4" />
                    <div className="space-y-1.5">
                      <div className="h-1.5 w-full bg-foreground/20 rounded" />
                      <div className="h-1.5 w-4/5 bg-foreground/20 rounded" />
                      <div className="h-1.5 w-3/4 bg-foreground/20 rounded" />
                    </div>
                    <div className="mt-3 h-2 w-20 bg-foreground/40 rounded" />
                    <div className="mt-2 space-y-1">
                      <div className="h-1.5 w-full bg-foreground/10 rounded" />
                      <div className="h-1.5 w-5/6 bg-foreground/10 rounded" />
                    </div>
                  </div>
                </div>

                {/* Template Info */}
                <div className="p-4">
                  <h3 className="font-headline font-semibold text-foreground mb-1">{template.name}</h3>
                  <p className="font-body text-sm text-muted-foreground">{template.description}</p>
                </div>

                {/* Selected Badge */}
                {selectedTemplate === template.id && (
                  <div className="absolute top-3 right-3 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-4 w-4" strokeWidth={2} />
                  </div>
                )}
              </Card>
            </Reveal>
          ))}
        </div>

        <Reveal className="text-center">
          <Button onClick={onProceed} size="lg" className="px-12">
            <Eye className="h-5 w-5" strokeWidth={1.5} />
            Preview Resume
          </Button>
        </Reveal>
      </div>
    </div>
  );
};
