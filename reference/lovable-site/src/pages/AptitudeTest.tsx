import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/app/PageHeader';
import { IconTile } from '@/components/app/primitives';
import Reveal from '@/components/marketing/Reveal';
import {
  Brain,
  Calculator,
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Trophy,
  Target,
  Timer,
  Play,
  Loader2,
  Lock,
} from 'lucide-react';

type Category = 'quantitative' | 'logical' | 'verbal';
type Difficulty = 'easy' | 'medium' | 'hard';
type TestPhase = 'setup' | 'loading' | 'test' | 'results';

interface MCQQuestion {
  id: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

interface TestResult {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeTaken: number;
  accuracy: number;
  answers: Record<number, string>;
}

const QUESTION_TIME_LIMIT = 60; // seconds per question

const EASE = [0.22, 1, 0.36, 1] as const;

const CATEGORY_ICON: Record<Category, typeof Calculator> = {
  quantitative: Calculator,
  logical: Brain,
  verbal: BookOpen,
};

const CATEGORY_BLURB: Record<Category, string> = {
  quantitative: 'Numbers, calculations & data',
  logical: 'Reasoning & problem solving',
  verbal: 'Language & comprehension',
};

const DIFFICULTY_BLURB: Record<Difficulty, string> = {
  easy: 'Basic questions for beginners',
  medium: 'Moderate challenge level',
  hard: 'Advanced difficulty',
};

const AptitudeTest: React.FC = () => {
  const { user } = useAuth();
  const { subscription, isFree, isPro, isPlus } = useSubscription();
  const navigate = useNavigate();

  // Test state
  const [phase, setPhase] = useState<TestPhase>('setup');
  const [category, setCategory] = useState<Category | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(QUESTION_TIME_LIMIT);
  const [totalTimeTaken, setTotalTimeTaken] = useState(0);
  const [testStartTime, setTestStartTime] = useState<Date | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [monthlyTestCount, setMonthlyTestCount] = useState(0);
  const [isLoadingCount, setIsLoadingCount] = useState(true);

  // Check monthly test count
  useEffect(() => {
    const checkMonthlyCount = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase.rpc('get_monthly_aptitude_test_count', {
          p_user_id: user.id
        });

        if (error) throw error;
        setMonthlyTestCount(data || 0);
      } catch (error) {
        console.error('Error checking monthly test count:', error);
      } finally {
        setIsLoadingCount(false);
      }
    };

    checkMonthlyCount();
  }, [user]);

  // Timer effect
  useEffect(() => {
    if (phase !== 'test') return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Auto move to next question
          handleNextQuestion();
          return QUESTION_TIME_LIMIT;
        }
        return prev - 1;
      });
      setTotalTimeTaken(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, currentQuestionIndex]);

  const canTakeTest = useCallback(() => {
    if (isPro || isPlus) return true;
    if (isFree && monthlyTestCount < 1) return true;
    return monthlyTestCount < 1; // Default beginner plan
  }, [isPro, isPlus, isFree, monthlyTestCount]);

  const getTestLimit = () => {
    if (isPro) return 'Unlimited';
    if (isPlus) return '10/month';
    if (isFree) return '1/month';
    return '1/month';
  };

  const handleStartTest = async () => {
    if (!category || !difficulty) {
      toast.error('Please select category and difficulty');
      return;
    }

    if (!canTakeTest()) {
      toast.error('You have reached your monthly test limit. Upgrade to take more tests!');
      return;
    }

    setPhase('loading');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await supabase.functions.invoke('generate-aptitude-questions', {
        body: { category, difficulty, count: 20 },
      });

      if (response.error || !response.data?.success) {
        throw new Error(response.data?.error || 'Failed to generate questions');
      }

      const generatedQuestions = response.data.questions as MCQQuestion[];

      // Create test session in database
      const { data: sessionData, error: sessionError } = await supabase
        .from('aptitude_test_sessions')
        .insert({
          user_id: user!.id,
          category,
          difficulty,
          questions: generatedQuestions as unknown as any,
          total_questions: generatedQuestions.length,
          status: 'in_progress'
        } as any)
        .select('id')
        .single();

      if (sessionError) throw sessionError;

      setSessionId(sessionData.id);
      setQuestions(generatedQuestions);
      setTestStartTime(new Date());
      setPhase('test');
      setTimeRemaining(QUESTION_TIME_LIMIT);
      toast.success('Test started! Good luck!');

    } catch (error) {
      console.error('Error starting test:', error);
      toast.error('Failed to start test. Please try again.');
      setPhase('setup');
    }
  };

  const handleAnswerSelect = (answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeRemaining(QUESTION_TIME_LIMIT);
    } else {
      handleSubmitTest();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setTimeRemaining(QUESTION_TIME_LIMIT);
    }
  };

  const handleSubmitTest = async () => {
    const endTime = new Date();
    const timeTaken = testStartTime
      ? Math.round((endTime.getTime() - testStartTime.getTime()) / 1000)
      : totalTimeTaken;

    // Calculate score
    let correctCount = 0;
    questions.forEach((q, index) => {
      if (answers[index] === q.correctAnswer) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const accuracy = Math.round((correctCount / Object.keys(answers).length) * 100) || 0;

    const testResult: TestResult = {
      score,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      timeTaken,
      accuracy,
      answers
    };

    setResult(testResult);

    // Update session in database
    if (sessionId) {
      try {
        await supabase
          .from('aptitude_test_sessions')
          .update({
            answers,
            score,
            correct_answers: correctCount,
            time_taken_seconds: timeTaken,
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', sessionId);
      } catch (error) {
        console.error('Error saving test results:', error);
      }
    }

    setPhase('results');
    toast.success('Test completed!');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (diff: Difficulty) => {
    switch (diff) {
      case 'easy': return 'bg-primary/10 text-primary';
      case 'medium': return 'bg-secondary/10 text-secondary';
      case 'hard': return 'bg-destructive/10 text-destructive';
    }
  };

  // Setup Phase
  if (phase === 'setup') {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-3xl px-6 py-12 lg:py-16">
              <PageHeader
                eyebrow="Aptitude"
                title={<>Test your <span className="text-spectrum">aptitude</span></>}
                subtitle="Test your skills with AI-generated questions. Choose your category and difficulty to begin."
              />

              {/* Quota */}
              <Reveal className="mt-8 flex flex-wrap items-center gap-3">
                <p className="font-body text-sm text-muted-foreground">
                  Tests this month{' '}
                  <span className="font-metric text-foreground">{monthlyTestCount}</span>
                  <span className="font-metric"> / {getTestLimit()}</span>
                </p>
                {!canTakeTest() && (
                  <Badge variant="destructive">
                    <Lock className="h-3 w-3" strokeWidth={1.5} />
                    Limit reached
                  </Badge>
                )}
              </Reveal>

              {/* Category Selection */}
              <Reveal className="mt-10">
                <p className="text-[10px] font-semibold uppercase tracking-label text-muted-foreground">
                  Select category
                </p>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  {(['quantitative', 'logical', 'verbal'] as Category[]).map((cat) => {
                    const selected = category === cat;
                    return (
                      <Card
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={cn(
                          'cursor-pointer rounded-2xl p-6 text-center',
                          selected
                            ? 'ring-1 ring-primary border-primary/40 shadow-soft'
                            : 'hover:-translate-y-1 transition-transform duration-500 ease-out-quint',
                        )}
                      >
                        <IconTile
                          icon={CATEGORY_ICON[cat]}
                          tone={selected ? 'primary' : 'muted'}
                          className="mx-auto"
                        />
                        <h3 className="mt-4 font-headline text-lg font-semibold capitalize text-foreground">
                          {cat}
                        </h3>
                        <p className="mt-2 font-body text-sm leading-body text-muted-foreground">
                          {CATEGORY_BLURB[cat]}
                        </p>
                      </Card>
                    );
                  })}
                </div>
              </Reveal>

              {/* Difficulty Selection */}
              <Reveal className="mt-8">
                <p className="text-[10px] font-semibold uppercase tracking-label text-muted-foreground">
                  Select difficulty
                </p>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => {
                    const selected = difficulty === diff;
                    return (
                      <Card
                        key={diff}
                        onClick={() => setDifficulty(diff)}
                        className={cn(
                          'cursor-pointer rounded-2xl p-6 text-center',
                          selected
                            ? 'ring-1 ring-primary border-primary/40 shadow-soft'
                            : 'hover:-translate-y-1 transition-transform duration-500 ease-out-quint',
                        )}
                      >
                        <Badge className={cn('border-transparent font-metric', getDifficultyColor(diff))}>
                          {diff.toUpperCase()}
                        </Badge>
                        <p className="mt-4 font-body text-sm leading-body text-muted-foreground">
                          {DIFFICULTY_BLURB[diff]}
                        </p>
                      </Card>
                    );
                  })}
                </div>
              </Reveal>

              {/* Test Info */}
              <Reveal className="mt-8">
                <Card className="rounded-2xl">
                  <div className="grid grid-cols-2 divide-x divide-foreground/[0.06] sm:grid-cols-4">
                    {[
                      { icon: Target, label: 'Questions', value: '20' },
                      { icon: Timer, label: 'Per Question', value: '60 sec' },
                      { icon: Clock, label: 'Total Time', value: '~20 min' },
                      { icon: Trophy, label: 'Passing', value: '60%' },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex flex-col items-center gap-1 p-6 text-center">
                        <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                        <span className="mt-1 font-metric text-2xl text-foreground">{value}</span>
                        <span className="font-body text-xs text-muted-foreground">{label}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </Reveal>

              {/* Start Button */}
              <Reveal className="mt-8 text-center">
                <Button
                  size="lg"
                  onClick={handleStartTest}
                  disabled={!category || !difficulty || !canTakeTest()}
                >
                  <Play className="mr-2 h-4 w-4" strokeWidth={1.75} />
                  Start Test
                </Button>

                {!canTakeTest() && (
                  <p className="mt-4 font-body text-sm text-muted-foreground">
                    <Button variant="link" onClick={() => navigate('/payments')}>
                      Upgrade your plan
                    </Button>
                    to take more tests this month.
                  </p>
                )}
              </Reveal>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  // Loading Phase
  if (phase === 'loading') {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex min-h-screen items-center justify-center bg-background px-6">
            <Card className="w-full max-w-md rounded-2xl p-10 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" strokeWidth={1.5} />
              <h2 className="mt-6 font-headline text-xl font-semibold text-foreground">
                Generating questions
              </h2>
              <p className="mt-2 font-body text-sm leading-body text-muted-foreground">
                Our AI is creating unique {difficulty} {category} questions for you.
              </p>
            </Card>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  // Test Phase
  if (phase === 'test' && questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    const timerProgress = (timeRemaining / QUESTION_TIME_LIMIT) * 100;

    return (
      <ProtectedRoute>
        <Layout>
          <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-3xl px-6 py-12 lg:py-16">
              {/* Header */}
              <Reveal>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-metric">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </Badge>
                    <Badge className={cn('border-transparent font-metric', getDifficultyColor(difficulty!))}>
                      {difficulty?.toUpperCase()}
                    </Badge>
                  </div>
                  <div
                    className={cn(
                      'flex items-center gap-2 font-metric text-lg',
                      timeRemaining <= 10 ? 'text-destructive' : 'text-muted-foreground',
                    )}
                  >
                    <Clock className="h-4 w-4" strokeWidth={1.5} />
                    {formatTime(timeRemaining)}
                  </div>
                </div>

                {/* Progress bars */}
                <div className="mt-6 space-y-2">
                  <Progress value={progress} className="h-1.5" />
                  <Progress
                    value={timerProgress}
                    className={cn('h-1', timeRemaining <= 10 && '[&>div]:bg-destructive')}
                  />
                </div>
              </Reveal>

              {/* Question Card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestionIndex}
                  initial={{ opacity: 0, x: 12, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, x: -12, filter: 'blur(6px)' }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="mt-8"
                >
                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="font-headline text-xl font-semibold leading-snug lg:text-2xl">
                        {currentQuestion.question}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(currentQuestion.options).map(([key, value]) => {
                          const selected = answers[currentQuestionIndex] === key;
                          return (
                            <div
                              key={key}
                              onClick={() => handleAnswerSelect(key)}
                              className={cn(
                                'flex cursor-pointer items-center gap-3 rounded-xl border border-foreground/[0.08] p-4 transition-transform duration-500 ease-out-quint hover:-translate-y-0.5',
                                selected && 'border-primary bg-primary/5',
                              )}
                            >
                              <span
                                className={cn(
                                  'grid h-8 w-8 shrink-0 place-items-center rounded-full font-metric text-sm',
                                  selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                                )}
                              >
                                {key}
                              </span>
                              <span className="font-body text-sm text-foreground">{value}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <Reveal className="mt-8 flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={1.75} />
                  Previous
                </Button>

                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {questions.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        'h-2 w-2 cursor-pointer rounded-full transition-transform duration-300 ease-out-quint',
                        index === currentQuestionIndex
                          ? 'bg-primary ring-2 ring-primary ring-offset-2 ring-offset-background'
                          : answers[index]
                            ? 'bg-primary'
                            : 'bg-muted',
                      )}
                      onClick={() => {
                        setCurrentQuestionIndex(index);
                        setTimeRemaining(QUESTION_TIME_LIMIT);
                      }}
                    />
                  ))}
                </div>

                {currentQuestionIndex < questions.length - 1 ? (
                  <Button onClick={handleNextQuestion}>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.75} />
                  </Button>
                ) : (
                  <Button variant="accent" onClick={handleSubmitTest}>
                    Submit Test
                    <CheckCircle2 className="ml-2 h-4 w-4" strokeWidth={1.5} />
                  </Button>
                )}
              </Reveal>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  // Results Phase
  if (phase === 'results' && result) {
    const passed = result.score >= 60;

    return (
      <ProtectedRoute>
        <Layout>
          <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-4xl px-6 py-12 lg:py-16">
              {/* Result Header */}
              <Reveal className="text-center">
                {passed ? (
                  <IconTile icon={Trophy} tone="primary" size="lg" className="mx-auto" />
                ) : (
                  <IconTile
                    icon={XCircle}
                    size="lg"
                    className="mx-auto bg-destructive/10 text-destructive"
                  />
                )}
                <h1 className="mt-6 font-headline text-h1 font-semibold tracking-headline text-foreground">
                  {passed ? (
                    <>You <span className="text-spectrum">passed</span></>
                  ) : (
                    <>Keep <span className="text-spectrum">practicing</span></>
                  )}
                </h1>
                <p className="mt-3 font-body text-body-lg leading-body text-muted-foreground">
                  {passed
                    ? 'You passed the test. Great job!'
                    : 'You didn\'t pass this time, but don\'t give up!'}
                </p>
              </Reveal>

              {/* Score Cards */}
              <Reveal className="mt-10">
                <Card className="rounded-2xl">
                  <div className="grid grid-cols-2 divide-x divide-foreground/[0.06] sm:grid-cols-4">
                    {[
                      { icon: Trophy, label: 'Score', value: `${result.score}%` },
                      { icon: CheckCircle2, label: 'Correct', value: `${result.correctAnswers}/${result.totalQuestions}` },
                      { icon: Target, label: 'Accuracy', value: `${result.accuracy}%` },
                      { icon: Clock, label: 'Time Taken', value: formatTime(result.timeTaken) },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex flex-col items-center gap-1 p-6 text-center">
                        <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                        <span className="mt-1 font-metric text-3xl text-foreground">{value}</span>
                        <span className="font-body text-xs text-muted-foreground">{label}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </Reveal>

              {/* Question Review */}
              <Reveal className="mt-8">
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="font-headline text-xl">Question Review</CardTitle>
                    <CardDescription>See how you performed on each question</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                      {questions.map((q, index) => {
                        const userAnswer = result.answers[index];
                        const isCorrect = userAnswer === q.correctAnswer;

                        return (
                          <div
                            key={index}
                            className={cn(
                              'rounded-xl border p-4',
                              isCorrect
                                ? 'border-primary/15 bg-primary/[0.04]'
                                : 'border-destructive/15 bg-destructive/[0.04]',
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={cn(
                                  'grid h-6 w-6 shrink-0 place-items-center rounded-full font-metric text-xs',
                                  isCorrect
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-destructive text-destructive-foreground',
                                )}
                              >
                                {index + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="font-body text-sm font-medium text-foreground">{q.question}</p>
                                <div className="mt-2 space-y-1 font-body text-sm">
                                  <p>
                                    <span className="text-muted-foreground">Your answer: </span>
                                    <span className={cn('font-medium', isCorrect ? 'text-primary' : 'text-destructive')}>
                                      {userAnswer ? `${userAnswer}. ${q.options[userAnswer as keyof typeof q.options]}` : 'Not answered'}
                                    </span>
                                  </p>
                                  {!isCorrect && (
                                    <p>
                                      <span className="text-muted-foreground">Correct answer: </span>
                                      <span className="font-medium text-primary">
                                        {q.correctAnswer}. {q.options[q.correctAnswer]}
                                      </span>
                                    </p>
                                  )}
                                  <p className="mt-2 italic text-muted-foreground">
                                    {q.explanation}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </Reveal>

              {/* Actions */}
              <Reveal className="mt-8 flex items-center justify-center gap-3">
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  Back to Dashboard
                </Button>
                <Button onClick={() => {
                  setPhase('setup');
                  setCategory(null);
                  setDifficulty(null);
                  setQuestions([]);
                  setCurrentQuestionIndex(0);
                  setAnswers({});
                  setResult(null);
                  setSessionId(null);
                  setTotalTimeTaken(0);
                }}>
                  Take Another Test
                </Button>
              </Reveal>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return null;
};

export default AptitudeTest;
