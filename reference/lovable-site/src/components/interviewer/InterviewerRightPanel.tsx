import React from 'react';
import { FileText, Settings, Terminal, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InterviewSettings, TranscriptChunk, LatencyStats } from '@/pages/Interviewer';

interface InterviewerRightPanelProps {
  transcriptChunks: TranscriptChunk[];
  currentInterimText: string;
  settings: InterviewSettings;
  eventLogs: string[];
  latencyStats: LatencyStats;
  onSettingsChange: (settings: InterviewSettings) => void;
}

const InterviewerRightPanel: React.FC<InterviewerRightPanelProps> = ({
  transcriptChunks,
  currentInterimText,
  settings,
  eventLogs,
  latencyStats,
  onSettingsChange,
}) => {
  const updateSetting = <K extends keyof InterviewSettings>(
    key: K,
    value: InterviewSettings[K],
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <Card className="h-full">
      <Tabs defaultValue="transcript" className="flex h-full flex-col">
        <CardHeader className="flex-shrink-0 pb-0">
          <TabsList className="grid h-11 w-full grid-cols-3">
            <TabsTrigger value="transcript" className="text-xs">
              <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
              Transcript
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">
              <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
              Settings
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-xs">
              <Terminal className="h-3.5 w-3.5" strokeWidth={1.5} />
              Logs
            </TabsTrigger>
          </TabsList>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 pt-4">
          {/* Transcript */}
          <TabsContent value="transcript" className="m-0 h-full">
            <ScrollArea className="h-full pr-2">
              <div className="space-y-2">
                {currentInterimText && (
                  <div className="rounded-xl border border-foreground/[0.06] bg-muted/40 p-3">
                    <p className="font-body text-sm italic text-muted-foreground">
                      {currentInterimText}
                    </p>
                  </div>
                )}

                {transcriptChunks.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="rounded-xl border border-foreground/[0.06] bg-muted/40 p-3"
                  >
                    <p className="font-body text-sm leading-relaxed text-foreground">{chunk.text}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-metric text-xs text-muted-foreground">
                        {chunk.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                      <Badge variant="outline" className="h-5 text-xs">
                        <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={1.5} />
                        {Math.round(chunk.confidence * 100)}%
                      </Badge>
                    </div>
                  </div>
                ))}

                {transcriptChunks.length === 0 && !currentInterimText && (
                  <div className="flex h-48 flex-col items-center justify-center text-center">
                    <FileText className="mb-3 h-10 w-10 text-muted-foreground/20" strokeWidth={1.5} />
                    <p className="font-body text-sm text-muted-foreground">
                      Your speech will appear here
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="m-0 h-full">
            <ScrollArea className="h-full pr-2">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-body text-[11px] font-semibold uppercase tracking-label text-muted-foreground/70">
                    Interview
                  </h4>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Role</Label>
                    <Input
                      value={settings.role}
                      onChange={(e) => updateSetting('role', e.target.value)}
                      placeholder="e.g., Software Engineer"
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Type</Label>
                      <Select
                        value={settings.type}
                        onValueChange={(v) => updateSetting('type', v as InterviewSettings['type'])}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HR">HR</SelectItem>
                          <SelectItem value="Behavioral">Behavioral</SelectItem>
                          <SelectItem value="Technical">Technical</SelectItem>
                          <SelectItem value="System Design">System Design</SelectItem>
                          <SelectItem value="Mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Difficulty</Label>
                      <Select
                        value={settings.difficulty}
                        onValueChange={(v) =>
                          updateSetting('difficulty', v as InterviewSettings['difficulty'])
                        }
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Easy">Easy</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Duration (min)</Label>
                    <Input
                      type="number"
                      value={settings.duration}
                      onChange={(e) => updateSetting('duration', parseInt(e.target.value) || 30)}
                      min={5}
                      max={60}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-4 border-t border-foreground/[0.06] pt-4">
                  <h4 className="font-body text-[11px] font-semibold uppercase tracking-label text-muted-foreground/70">
                    Voice
                  </h4>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">AI voice</Label>
                    <Select value={settings.voice} onValueChange={(v) => updateSetting('voice', v)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Anushka">Anushka</SelectItem>
                        <SelectItem value="Manisha">Manisha</SelectItem>
                        <SelectItem value="Vidya">Vidya</SelectItem>
                        <SelectItem value="Arjun">Arjun</SelectItem>
                        <SelectItem value="Amol">Amol</SelectItem>
                        <SelectItem value="Amartya">Amartya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Speed</Label>
                      <span className="font-metric text-xs font-medium text-foreground">
                        {settings.pace.toFixed(1)}x
                      </span>
                    </div>
                    <Slider
                      value={[settings.pace]}
                      onValueChange={([v]) => updateSetting('pace', v)}
                      min={0.5}
                      max={2}
                      step={0.1}
                      className="py-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Pitch</Label>
                      <span className="font-metric text-xs font-medium text-foreground">
                        {settings.pitch.toFixed(1)}
                      </span>
                    </div>
                    <Slider
                      value={[settings.pitch]}
                      onValueChange={([v]) => updateSetting('pitch', v)}
                      min={0.5}
                      max={2}
                      step={0.1}
                      className="py-2"
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Logs */}
          <TabsContent value="logs" className="m-0 h-full">
            <div className="flex h-full flex-col space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'STT', value: latencyStats.stt },
                  { label: 'LLM', value: latencyStats.llm },
                  { label: 'TTS', value: latencyStats.tts },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-foreground/[0.06] bg-muted/40 p-2 text-center"
                  >
                    <div className="mb-0.5 flex items-center justify-center gap-1 font-body text-xs text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" strokeWidth={1.5} />
                      {s.label}
                    </div>
                    <span className="font-metric text-sm font-semibold text-foreground">
                      {s.value}ms
                    </span>
                  </div>
                ))}
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-1 font-mono text-xs">
                  {eventLogs.map((log, index) => (
                    <div
                      key={index}
                      className={`rounded px-2 py-1.5 text-xs ${
                        log.includes('Error')
                          ? 'bg-destructive/[0.08] text-destructive'
                          : 'bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      {log}
                    </div>
                  ))}
                  {eventLogs.length === 0 && (
                    <div className="flex h-24 flex-col items-center justify-center text-center">
                      <Terminal className="mb-1 h-6 w-6 text-muted-foreground/20" strokeWidth={1.5} />
                      <p className="font-body text-xs text-muted-foreground">No logs yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
};

export default InterviewerRightPanel;
