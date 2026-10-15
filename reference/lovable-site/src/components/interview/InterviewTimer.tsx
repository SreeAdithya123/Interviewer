import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InterviewTimerProps {
  timeRemaining: string;
  isWarning?: boolean;
}

const InterviewTimer: React.FC<InterviewTimerProps> = ({
  timeRemaining,
  isWarning = false,
}) => {
  // Parse time to determine if we're in warning zone (< 2 minutes)
  const parts = timeRemaining.split(':');
  const minutes = parseInt(parts[0], 10);
  const showWarning = isWarning || minutes < 2;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-body text-xs font-medium transition-colors duration-300',
        showWarning
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : 'border-foreground/10 bg-card text-foreground shadow-soft'
      )}
    >
      <Clock className="h-4 w-4" strokeWidth={1.5} />
      <span className="font-metric">{timeRemaining}</span>
      {showWarning && <span className="ml-1 text-[10px] text-muted-foreground">remaining</span>}
    </div>
  );
};

export default InterviewTimer;
