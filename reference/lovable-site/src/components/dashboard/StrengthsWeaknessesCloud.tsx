import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import Reveal from '@/components/marketing/Reveal';

interface StrengthsWeaknessesCloudProps {
  strengths: Array<{ text: string; count: number }>;
  weaknesses: Array<{ text: string; count: number }>;
}

const StrengthsWeaknessesCloud: React.FC<StrengthsWeaknessesCloudProps> = ({
  strengths = [],
  weaknesses = []
}) => {
  const getWordSize = (count: number, maxCount: number) => {
    const minSize = 12;
    const maxSize = 24;
    return minSize + ((count / maxCount) * (maxSize - minSize));
  };

  // Guard against undefined or empty arrays
  const safeStrengths = strengths || [];
  const safeWeaknesses = weaknesses || [];

  const maxStrengthCount = safeStrengths.length > 0 ? Math.max(...safeStrengths.map(s => s.count), 1) : 1;
  const maxWeaknessCount = safeWeaknesses.length > 0 ? Math.max(...safeWeaknesses.map(w => w.count), 1) : 1;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Strengths Word Cloud */}
      <Reveal index={0}>
        <Card>
          <CardHeader>
            <div className="font-body text-[10px] uppercase tracking-label text-muted-foreground/70">Strengths</div>
            <div className="flex items-center space-x-2">
              <TrendingUp strokeWidth={1.5} className="h-5 w-5 text-emerald-600" />
              <CardTitle className="font-headline text-lg font-semibold text-foreground">Top Strengths</CardTitle>
            </div>
            <CardDescription>Most frequently mentioned positive traits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 justify-center min-h-[120px] items-center">
              {safeStrengths.length > 0 ? (
                safeStrengths.map((strength, index) => (
                  <Badge
                    key={index}
                    variant="success"
                    style={{
                      fontSize: `${getWordSize(strength.count, maxStrengthCount)}px`,
                      padding: '4px 12px'
                    }}
                  >
                    {strength.text} ({strength.count})
                  </Badge>
                ))
              ) : (
                <p className="text-muted-foreground text-center">Complete more interviews to see your strengths</p>
              )}
            </div>
          </CardContent>
        </Card>
      </Reveal>

      {/* Weaknesses Word Cloud */}
      <Reveal index={1}>
        <Card>
          <CardHeader>
            <div className="font-body text-[10px] uppercase tracking-label text-muted-foreground/70">Focus areas</div>
            <div className="flex items-center space-x-2">
              <TrendingDown strokeWidth={1.5} className="h-5 w-5 text-amber-600" />
              <CardTitle className="font-headline text-lg font-semibold text-foreground">Areas for Improvement</CardTitle>
            </div>
            <CardDescription>Most frequently mentioned areas to work on</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 justify-center min-h-[120px] items-center">
              {safeWeaknesses.length > 0 ? (
                safeWeaknesses.map((weakness, index) => (
                  <Badge
                    key={index}
                    variant="warning"
                    style={{
                      fontSize: `${getWordSize(weakness.count, maxWeaknessCount)}px`,
                      padding: '4px 12px'
                    }}
                  >
                    {weakness.text} ({weakness.count})
                  </Badge>
                ))
              ) : (
                <p className="text-muted-foreground text-center">Complete more interviews to identify improvement areas</p>
              )}
            </div>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
};

export default StrengthsWeaknessesCloud;
