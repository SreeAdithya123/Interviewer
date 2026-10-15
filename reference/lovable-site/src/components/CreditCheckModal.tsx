import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useSubscription, PLAN_DETAILS } from '@/hooks/useSubscription';
import { UpgradePrompt } from '@/components/app/primitives';

interface CreditCheckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreditCheckModal: React.FC<CreditCheckModalProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const { subscription, planDetails } = useSubscription();

  const handleViewPlans = () => {
    onOpenChange(false);
    navigate('/payments');
  };

  const handleGoToDashboard = () => {
    onOpenChange(false);
    navigate('/dashboard');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-2xl bg-muted grid place-items-center">
              <AlertTriangle className="h-6 w-6 text-foreground" strokeWidth={1.5} />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">No Interview Credits</DialogTitle>
          <DialogDescription className="text-center">
            You've used all your interview credits for this month.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-2xl border border-foreground/[0.06] bg-muted/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Plan</span>
              <span className="font-medium capitalize">{planDetails.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Credits Used</span>
              <span className="font-metric font-medium">
                {subscription?.credits_per_month ?? 0} / {subscription?.credits_per_month ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Next Reset</span>
              <span className="font-medium">Beginning of next month</span>
            </div>
          </div>

          <UpgradePrompt
            compact
            title="Need more interviews?"
            body="Upgrade to Plus (5/month) or Pro (10/month) for more practice time and premium features."
            cta="View upgrade options"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleViewPlans} className="w-full">
            View Upgrade Options
          </Button>
          <Button variant="outline" onClick={handleGoToDashboard} className="w-full">
            Go to Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreditCheckModal;
