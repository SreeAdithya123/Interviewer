import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import Reveal from '@/components/marketing/Reveal';

interface ScoreProgressChartProps {
  data: Array<{
    date: string;
    score: number;
    interview: string;
  }>;
}

const ScoreProgressChart: React.FC<ScoreProgressChartProps> = ({ data }) => {
  const latestScore = data[data.length - 1]?.score || 0;
  const previousScore = data[data.length - 2]?.score || 0;
  const improvement = latestScore - previousScore;

  return (
    <Reveal>
      <Card className="w-full">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="font-body text-[10px] uppercase tracking-label text-muted-foreground/70">Progress</div>
              <CardTitle className="font-headline text-lg font-semibold">Score Progress</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Track your interview performance over time</CardDescription>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs">
              <TrendingUp strokeWidth={1.5} className={`h-3.5 w-3.5 ${improvement >= 0 ? 'text-foreground' : 'text-destructive'}`} />
              <span className={`font-metric ${improvement >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                {improvement >= 0 ? '+' : ''}{improvement} pts
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-48 sm:h-64 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                <CartesianGrid stroke="hsl(var(--foreground)/0.06)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontFamily: 'Space Grotesk, ui-sans-serif' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontFamily: 'Space Grotesk, ui-sans-serif' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${value}%`}
                  width={35}
                />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Score']}
                  labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--foreground)/0.08)',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-medium)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </Reveal>
  );
};

export default ScoreProgressChart;
