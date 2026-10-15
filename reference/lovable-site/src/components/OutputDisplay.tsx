
import React, { useState } from 'react';
import { X, Download, Copy, FileText, BookOpen, CreditCard, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import Reveal from '@/components/marketing/Reveal';

interface OutputDisplayProps {
  fileName: string;
  type: string;
  content: string;
  onClose: () => void;
}

const cleanOutput = (text: string): string => {
  return text
    .replace(/```[\s\S]*?```/g, '')       // Remove code blocks
    .replace(/^#{1,6}\s+/gm, '')          // Remove # headings
    .replace(/\*\*([^*]+)\*\*/g, '$1')    // Remove **bold**
    .replace(/\*([^*]+)\*/g, '$1')        // Remove *italic*
    .replace(/__([^_]+)__/g, '$1')        // Remove __bold__
    .replace(/_([^_]+)_/g, '$1')          // Remove _italic_
    .replace(/`([^`]+)`/g, '$1')          // Remove inline code
    .replace(/\n{3,}/g, '\n\n')           // Normalize whitespace
    .trim();
};

const OutputDisplay: React.FC<OutputDisplayProps> = ({ fileName, type, content, onClose }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const cleanedContent = cleanOutput(content);

  const getIcon = () => {
    switch (type.toLowerCase()) {
      case 'summary':
        return FileText;
      case 'bullet notes':
        return BookOpen;
      case 'flashcards':
        return CreditCard;
      case 'q&a format':
        return HelpCircle;
      default:
        return FileText;
    }
  };

  const Icon = getIcon();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanedContent);
      toast({
        title: "Copied to clipboard",
        description: "The generated content has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy content to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([cleanedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.split('.')[0]}_${type.toLowerCase().replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download started",
      description: "Your generated material is being downloaded.",
    });
  };

  return (
    <Reveal>
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="bg-ink text-ink-foreground p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                <Icon className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-headline text-lg font-semibold tracking-tight">Generated Material</h3>
                <p className="text-sm text-ink-muted">{fileName} • {type}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="rounded-lg p-2 transition-colors hover:bg-white/10"
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <button
                onClick={handleDownload}
                className="rounded-lg p-2 transition-colors hover:bg-white/10"
                title="Download"
              >
                <Download className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-2 transition-colors hover:bg-white/10"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className={`${isExpanded ? '' : 'max-h-64 overflow-hidden'} transition-all duration-300`}>
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap font-body text-sm leading-relaxed text-foreground">
                {cleanedContent}
              </pre>
            </div>
          </div>

          {content.length > 500 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-4 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </button>
          )}
        </div>
      </Card>
    </Reveal>
  );
};

export default OutputDisplay;
