import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Reveal } from '@/components/marketing/Reveal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Interview {
  id: string;
  question: string;
  answer: string;
  feedback: string | null;
  timestamp: string;
}

const HistoryHeader = ({ count }: { count?: number }) => (
  <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/[0.06]">
    <div className="flex items-center gap-2">
      <span className="font-metric text-[11px] uppercase tracking-label text-muted-foreground">
        Interview history
      </span>
      {typeof count === 'number' && (
        <span className="rounded-full bg-muted px-2 py-0.5 font-metric text-xs text-foreground">
          {count}
        </span>
      )}
    </div>
  </div>
);

const InterviewHistoryTable = () => {
  const { user } = useAuth();

  const { data: interviews, isLoading, error, refetch } = useQuery({
    queryKey: ['interviews', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data as Interview[];
    },
    enabled: !!user?.id,
  });

  const handleDeleteInterview = async (interviewId: string) => {
    try {
      const { error } = await supabase
        .from('interviews')
        .delete()
        .eq('id', interviewId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Interview Deleted",
        description: "The interview record has been successfully deleted.",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete interview record.",
        variant: "destructive",
      });
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <HistoryHeader />
        <div className="p-6">
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="overflow-hidden">
        <HistoryHeader />
        <div className="p-6 text-center text-destructive">
          <p className="font-medium">Error loading interview history</p>
          <p className="text-sm mt-1">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
        </div>
      </Card>
    );
  }

  if (!interviews || interviews.length === 0) {
    return (
      <Reveal>
        <Card className="overflow-hidden">
          <HistoryHeader />
          <div className="p-6">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-foreground/15 bg-muted/40 px-6 py-12 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
              <h3 className="mt-4 font-headline text-lg font-medium text-foreground">
                No interview history yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Start your first interview to see your history here.
              </p>
            </div>
          </div>
        </Card>
      </Reveal>
    );
  }

  return (
    <Reveal>
      <Card className="overflow-hidden">
        <HistoryHeader count={interviews.length} />

        {/* Mobile View - Cards */}
        <div className="block md:hidden divide-y divide-foreground/[0.06]">
          {interviews.slice(0, 5).map((interview) => (
            <div key={interview.id} className="p-4 transition-colors hover:bg-muted/40">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 font-metric text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" strokeWidth={1.5} />
                  <span>{formatTimestamp(interview.timestamp)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteInterview(interview.id)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Button>
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                {truncateText(interview.question, 100)}
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                {truncateText(interview.answer, 80)}
              </p>
              {interview.feedback && (
                <p className="text-xs text-secondary">
                  {truncateText(interview.feedback, 80)}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" strokeWidth={1.5} />
                    <span>Date</span>
                  </div>
                </TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Answer</TableHead>
                <TableHead>Feedback</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interviews.slice(0, 5).map((interview) => (
                <TableRow key={interview.id}>
                  <TableCell className="font-medium">
                    <span className="font-metric text-xs text-muted-foreground">
                      {formatTimestamp(interview.timestamp)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs sm:text-sm font-medium text-foreground line-clamp-2">
                      {truncateText(interview.question, 100)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                      {truncateText(interview.answer, 100)}
                    </p>
                  </TableCell>
                  <TableCell>
                    {interview.feedback ? (
                      <p className="text-xs sm:text-sm text-secondary line-clamp-2">
                        {truncateText(interview.feedback, 100)}
                      </p>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No feedback</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteInterview(interview.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {interviews.length > 5 && (
          <div className="px-6 py-3 border-t border-foreground/[0.06] text-center">
            <span className="font-metric text-xs text-muted-foreground">
              Showing 5 of {interviews.length} interviews
            </span>
          </div>
        )}
      </Card>
    </Reveal>
  );
};

export default InterviewHistoryTable;
