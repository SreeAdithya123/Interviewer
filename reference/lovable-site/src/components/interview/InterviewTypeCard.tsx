import React from 'react';
import { ArrowRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/app/primitives';

interface InterviewTypeCardProps {
  type: {
    id: string;
    name: string;
    icon: LucideIcon;
    description: string;
  };
  isSelected: boolean;
  onSelect: (typeId: string) => void;
  onStart: (typeId: string) => void;
  index: number;
}

const InterviewTypeCard: React.FC<InterviewTypeCardProps> = ({
  type,
  isSelected,
  onSelect,
  onStart,
}) => {
  return (
    <Card
      onClick={() => onSelect(type.id)}
      className={cn(
        'p-8 cursor-pointer hover:-translate-y-1 transition-transform duration-500 ease-out-quint',
        isSelected && 'ring-2 ring-primary/30 bg-primary/[0.04]',
      )}
    >
      <IconTile icon={type.icon} size="lg" />

      <h3 className="mt-6 font-headline text-h3 font-semibold tracking-tight text-foreground">
        {type.name}
      </h3>
      <p className="mt-2 font-body text-sm leading-body text-muted-foreground">
        {type.description}
      </p>

      <Button
        onClick={(e) => {
          e.stopPropagation();
          onStart(type.id);
        }}
        className="mt-6 w-full"
      >
        Start Interview
        <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
      </Button>
    </Card>
  );
};

export default InterviewTypeCard;
