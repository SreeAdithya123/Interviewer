import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { Play, Send, RotateCcw, Code2, Timer, CheckCircle, XCircle, Sparkles, History, ArrowRight } from 'lucide-react';
import CodeEditor from '../components/CodeEditor';
import ProtectedRoute from '../components/ProtectedRoute';
import CreditCheckModal from '../components/CreditCheckModal';
import Layout from '../components/Layout';
import PageHeader from '@/components/app/PageHeader';
import Reveal from '@/components/marketing/Reveal';

interface Problem {
  id: string;
  title: string;
  difficulty: string;
  description: string;
  constraints?: string[];
  testCases?: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  starterCode: {
    python: string;
    cpp: string;
    c: string;
    java: string;
    javascript: string;
  };
}

interface Evaluation {
  feedback: string;
  timeComplexity: string;
  spaceComplexity: string;
  score: number;
  strengths: string[];
  improvements: string[];
}

const CodingInterview = () => {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [language, setLanguage] = useState<string>('python');
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const { hasCredits, deductCredit } = useSubscription();

  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ['coding-history'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('coding_interview_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const difficultyColors = {
    easy: 'border-transparent bg-emerald-500/10 text-emerald-600',
    medium: 'border-transparent bg-amber-500/10 text-amber-600',
    hard: 'border-transparent bg-destructive/10 text-destructive'
  };

  useEffect(() => {
    loadRandomProblem();
  }, []);

  useEffect(() => {
    if (problem) {
      setCode(problem.starterCode[language as keyof typeof problem.starterCode]);
    }
  }, [language, problem]);

  const loadRandomProblem = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('coding-problem-generator', {
        body: { difficulty: null }
      });

      if (error) throw error;

      if (data.success && data.problem) {
        setProblem(data.problem);
        setCode(data.problem.starterCode.python);
        setEvaluation(null);
        setOutput('');
        setIsCorrect(null);
      }
    } catch (error) {
      console.error('Error loading problem:', error);
      toast({
        title: "Error",
        description: "Failed to load coding problem",
        variant: "destructive"
      });
    }
  };

  const handleRunCode = async () => {
    if (!problem || !code.trim()) {
      toast({
        title: "No Code",
        description: "Please write some code before running",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setOutput('Analyzing your code against test cases...');
    setIsCorrect(null);
    setExecutionTime(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('coding-evaluate', {
        body: { code, language, problem, mode: 'run' },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : {}
      });

      if (error) throw error;

      if (data.success) {
        setOutput(data.output || data.analysis || 'Code analysis complete.');
        setIsCorrect(data.isCorrect);
      } else {
        throw new Error(data.error || 'Run failed');
      }
    } catch (error: any) {
      console.error('Error running code:', error);
      setOutput(`Error: ${error.message || 'Failed to analyze code'}`);
      toast({
        title: "Run Error",
        description: "Failed to analyze your code",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!problem) return;

    if (!hasCredits) {
      setShowCreditModal(true);
      return;
    }

    if (!code.trim()) {
      toast({
        title: "No Code",
        description: "Please write some code before submitting",
        variant: "destructive"
      });
      return;
    }

    setIsEvaluating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('coding-evaluate', {
        body: { code, language, problem, mode: 'evaluate' },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : {}
      });

      if (error) throw error;

      if (data.success) {
        setEvaluation(data.evaluation);
        setIsCorrect(data.evaluation.isCorrect ?? null);
        refetchHistory();
        deductCredit({ interviewType: 'coding' });
        toast({
          title: "Evaluation Complete",
          description: `Your solution scored ${data.evaluation.score}/10`
        });
      }
    } catch (error) {
      console.error('Error evaluating code:', error);
      toast({
        title: "Evaluation Error",
        description: "Failed to evaluate your solution",
        variant: "destructive"
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNextProblem = () => {
    setEvaluation(null);
    setOutput('');
    setExecutionTime(null);
    setIsCorrect(null);
    loadRandomProblem();
  };

  const handleReset = () => {
    if (problem) {
      setCode(problem.starterCode[language as keyof typeof problem.starterCode]);
      setOutput('');
      setEvaluation(null);
      setIsCorrect(null);
      setExecutionTime(null);
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="min-h-screen bg-background">
          <div className="max-w-7xl mx-auto px-6 py-10 lg:py-14">
            <PageHeader
              eyebrow="Coding practice"
              title={<>Real-time coding <span className="text-spectrum">challenges</span></>}
              subtitle="AI-powered feedback across 35 problems at every difficulty level."
              back={{ to: '/interview-copilot', label: 'Back' }}
              actions={
                <>
                  <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
                    <History className="w-4 h-4" strokeWidth={1.5} />
                    {showHistory ? 'Hide history' : 'Show history'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={loadRandomProblem}>
                    <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
                    New problem
                  </Button>
                </>
              }
            />

            {showHistory ? (
              <Reveal index={0} className="mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Submission history</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[600px]">
                      {history && history.length > 0 ? (
                        <div className="space-y-3">
                          {history.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-xl border border-foreground/[0.06] bg-muted/40 p-4"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <h3 className="font-headline text-base font-semibold tracking-tight text-foreground">
                                    {item.problem_title}
                                  </h3>
                                  <p className="mt-1 font-metric text-xs text-muted-foreground">
                                    {new Date(item.created_at).toLocaleString()}
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <Badge className={difficultyColors[item.difficulty as keyof typeof difficultyColors]}>
                                    {item.difficulty}
                                  </Badge>
                                  {item.score && (
                                    <Badge variant="outline" className="font-metric">
                                      {item.score}/10
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
                                <div className="flex gap-2">
                                  <span className="text-muted-foreground">Language</span>
                                  <span className="font-mono text-foreground">{item.language}</span>
                                </div>
                                {item.time_complexity && (
                                  <div className="flex gap-2">
                                    <span className="text-muted-foreground">Time</span>
                                    <span className="font-metric text-foreground">{item.time_complexity}</span>
                                  </div>
                                )}
                                {item.space_complexity && (
                                  <div className="flex gap-2">
                                    <span className="text-muted-foreground">Space</span>
                                    <span className="font-metric text-foreground">{item.space_complexity}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="py-8 text-center font-body text-sm text-muted-foreground">No submissions yet</p>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </Reveal>
            ) : (
              <div className="mt-8 grid lg:grid-cols-3 gap-8">
                <Reveal index={0} className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Problem</CardTitle>
                        {problem && (
                          <Badge className={difficultyColors[problem.difficulty as keyof typeof difficultyColors]}>
                            {problem.difficulty}
                          </Badge>
                        )}
                      </div>
                      {problem && (
                        <CardDescription className="font-headline text-lg font-semibold tracking-tight text-foreground">
                          {problem.title}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[calc(100vh-400px)]">
                        {problem ? (
                          <div className="space-y-5">
                            <div>
                              <h3 className="mb-2 text-[10px] uppercase tracking-label text-muted-foreground">Description</h3>
                              <p className="whitespace-pre-wrap font-body text-sm leading-body text-muted-foreground">{problem.description}</p>
                            </div>

                            {problem.constraints && problem.constraints.length > 0 && (
                              <div>
                                <h3 className="mb-2 text-[10px] uppercase tracking-label text-muted-foreground">Constraints</h3>
                                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                                  {problem.constraints.map((constraint, idx) => (
                                    <li key={idx}>{constraint}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {problem.testCases && problem.testCases.length > 0 && (
                              <div>
                                <h3 className="mb-2 text-[10px] uppercase tracking-label text-muted-foreground">Test cases</h3>
                                <div className="space-y-3">
                                  {problem.testCases.map((testCase, idx) => (
                                    <div key={idx} className="rounded-xl border border-foreground/[0.06] bg-muted/40 p-4">
                                      <p className="text-sm text-muted-foreground"><strong className="font-medium text-foreground">Input:</strong> {testCase.input}</p>
                                      <p className="text-sm text-muted-foreground"><strong className="font-medium text-foreground">Output:</strong> {testCase.output}</p>
                                      {testCase.explanation && (
                                        <p className="mt-1 text-sm text-muted-foreground/70">
                                          <strong className="font-medium text-foreground/80">Explanation:</strong> {testCase.explanation}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="py-8 text-center font-body text-sm text-muted-foreground">Loading problem…</div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </Reveal>

                <div className="lg:col-span-2 space-y-6">
                  <Reveal index={1}>
                    <Card>
                      <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Code2 className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                            Code editor
                          </CardTitle>
                          <div className="flex items-center gap-3">
                            <Select value={language} onValueChange={setLanguage}>
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="python">Python</SelectItem>
                                <SelectItem value="javascript">JavaScript</SelectItem>
                                <SelectItem value="cpp">C++</SelectItem>
                                <SelectItem value="c">C</SelectItem>
                                <SelectItem value="java">Java</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button onClick={handleReset} variant="outline" size="sm">
                              <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
                              Reset
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="overflow-hidden rounded-xl border border-foreground/[0.06]">
                          <CodeEditor
                            language={language}
                            value={code}
                            onChange={setCode}
                            height="400px"
                          />
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button onClick={handleRunCode} disabled={isRunning} variant="secondary">
                            <Play className="w-4 h-4" strokeWidth={1.5} />
                            {isRunning ? 'Analyzing…' : 'Run code'}
                          </Button>
                          <Button onClick={handleSubmit} disabled={isEvaluating || !code.trim()}>
                            <Send className="w-4 h-4" strokeWidth={1.5} />
                            {isEvaluating ? 'Evaluating…' : 'Submit solution'}
                          </Button>
                          {evaluation && (
                            <Button onClick={handleNextProblem} variant="outline">
                              <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                              Next problem
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Reveal>

                  {output && (
                    <Reveal index={2}>
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Timer className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                            Output
                            {isCorrect !== null && (
                              isCorrect ? (
                                <Badge variant="success" className="ml-1">
                                  <CheckCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                                  Correct
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="ml-1">
                                  <XCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                                  Incorrect
                                </Badge>
                              )
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="whitespace-pre-wrap rounded-xl bg-ink p-4 font-mono text-sm text-ink-foreground">
                            {output}
                          </pre>
                        </CardContent>
                      </Card>
                    </Reveal>
                  )}

                  {evaluation && (
                    <Reveal index={3}>
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Sparkles className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                            AI evaluation
                            <span className="ml-auto rounded-full bg-primary/10 px-3 py-1 font-metric text-2xl text-primary">
                              {evaluation.score}
                              <span className="text-sm text-primary/60">/10</span>
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <h4 className="mb-2 text-[10px] uppercase tracking-label text-muted-foreground">Feedback</h4>
                            <p className="font-body text-sm leading-body text-muted-foreground">{evaluation.feedback}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-xl border border-foreground/[0.06] bg-muted/40 p-4">
                              <h5 className="text-[10px] uppercase tracking-label text-muted-foreground">Time complexity</h5>
                              <p className="mt-1 font-metric text-lg text-foreground">{evaluation.timeComplexity}</p>
                            </div>
                            <div className="rounded-xl border border-foreground/[0.06] bg-muted/40 p-4">
                              <h5 className="text-[10px] uppercase tracking-label text-muted-foreground">Space complexity</h5>
                              <p className="mt-1 font-metric text-lg text-foreground">{evaluation.spaceComplexity}</p>
                            </div>
                          </div>

                          {evaluation.strengths.length > 0 && (
                            <div>
                              <h4 className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-label text-muted-foreground">
                                <CheckCircle className="h-3.5 w-3.5 text-foreground/40" strokeWidth={1.5} />
                                Strengths
                              </h4>
                              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                                {evaluation.strengths.map((strength, idx) => (
                                  <li key={idx}>{strength}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {evaluation.improvements.length > 0 && (
                            <div>
                              <h4 className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-label text-muted-foreground">
                                <Sparkles className="h-3.5 w-3.5 text-foreground/40" strokeWidth={1.5} />
                                Improvements
                              </h4>
                              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                                {evaluation.improvements.map((improvement, idx) => (
                                  <li key={idx}>{improvement}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Reveal>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <CreditCheckModal open={showCreditModal} onOpenChange={setShowCreditModal} />
      </Layout>
    </ProtectedRoute>
  );
};

export default CodingInterview;
