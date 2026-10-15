import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  ArrowRight,
  RefreshCw,
  Flag,
  FileText,
  Volume2,
  Bot,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { IconTile } from '@/components/app/primitives';
import { Message } from '@/pages/Interviewer';

interface InterviewerConversationPanelProps {
  messages: Message[];
  currentInterimText: string;
  isSessionActive: boolean;
  onSendMessage: (text: string) => void;
  onAskNextQuestion: () => void;
  onRepeatQuestion: () => void;
  onFlagQuestion: () => void;
  onEndAndReport: () => void;
  onReplayAudio: (audioUrl: string) => void;
}

const InterviewerConversationPanel: React.FC<InterviewerConversationPanelProps> = ({
  messages,
  currentInterimText,
  isSessionActive,
  onSendMessage,
  onAskNextQuestion,
  onRepeatQuestion,
  onFlagQuestion,
  onEndAndReport,
  onReplayAudio,
}) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentInterimText]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-shrink-0 border-b border-foreground/[0.06] pb-3">
        <CardTitle className="flex items-center gap-2 font-headline text-base font-semibold text-foreground">
          <IconTile icon={Bot} size="sm" tone="ink" />
          Conversation
        </CardTitle>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col space-y-4 p-4">
        {/* Messages */}
        <ScrollArea className="flex-1 pr-2" ref={scrollRef}>
          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex ${message.role === 'ai' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`flex max-w-[85%] gap-2.5 ${
                      message.role === 'user' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                        message.role === 'ai'
                          ? 'bg-ink text-ink-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {message.role === 'ai' ? (
                        <Bot className="h-3.5 w-3.5" strokeWidth={1.5} />
                      ) : (
                        <User className="h-3.5 w-3.5" strokeWidth={1.5} />
                      )}
                    </span>

                    <div
                      className={`rounded-2xl px-4 py-2.5 ${
                        message.role === 'ai'
                          ? 'bg-muted text-foreground'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      <p className="font-body text-sm leading-relaxed">{message.text}</p>
                      <div
                        className={`mt-1.5 flex items-center gap-2 font-metric text-xs ${
                          message.role === 'ai'
                            ? 'text-muted-foreground'
                            : 'text-primary-foreground/70'
                        }`}
                      >
                        <span>{formatTime(message.timestamp)}</span>
                        {message.role === 'ai' && message.audioUrl && (
                          <button
                            onClick={() => onReplayAudio(message.audioUrl!)}
                            className="p-0.5 transition-colors hover:text-primary"
                            title="Replay audio"
                          >
                            <Volume2 className="h-3 w-3" strokeWidth={1.5} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {currentInterimText && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-end"
              >
                <div className="flex max-w-[85%] flex-row-reverse gap-2.5">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-muted text-foreground">
                    <User className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </span>
                  <div className="rounded-2xl bg-muted/50 px-4 py-2.5 text-muted-foreground">
                    <p className="font-body text-sm italic">{currentInterimText}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {messages.length === 0 && !isSessionActive && (
              <div className="flex h-64 flex-col items-center justify-center px-4 text-center">
                <IconTile icon={Bot} size="lg" />
                <h3 className="mt-4 font-headline text-base font-semibold text-foreground">
                  Ready to practise
                </h3>
                <p className="mt-1 max-w-xs font-body text-sm text-muted-foreground">
                  Start a session to begin your AI-powered interview practice.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 border-t border-foreground/[0.06] pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onAskNextQuestion}
            disabled={!isSessionActive}
            className="h-8 text-xs"
          >
            <ArrowRight className="mr-1 h-3 w-3" strokeWidth={1.5} />
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRepeatQuestion}
            disabled={!isSessionActive || messages.length === 0}
            className="h-8 text-xs"
          >
            <RefreshCw className="mr-1 h-3 w-3" strokeWidth={1.5} />
            Repeat
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onFlagQuestion}
            disabled={!isSessionActive}
            className="h-8 text-xs"
          >
            <Flag className="mr-1 h-3 w-3" strokeWidth={1.5} />
            Flag
          </Button>
          <Button
            size="sm"
            onClick={onEndAndReport}
            disabled={messages.length === 0}
            className="ml-auto h-8 text-xs"
          >
            <FileText className="mr-1 h-3 w-3" strokeWidth={1.5} />
            Generate report
          </Button>
        </div>

        {/* Text input */}
        <div className="flex gap-2">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your response…"
            className="h-10 flex-1"
          />
          <Button onClick={handleSend} disabled={!inputText.trim()} size="icon" className="h-10 w-10">
            <Send className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InterviewerConversationPanel;
