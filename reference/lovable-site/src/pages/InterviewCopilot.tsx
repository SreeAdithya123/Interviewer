import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversation } from '@11labs/react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useInterviewCredits } from '@/hooks/useInterviewCredits';
import { processInterviewEnd } from '@/services/interviewSessionService';
import ProtectedRoute from '../components/ProtectedRoute';
import Layout from '../components/Layout';
import PageHeader from '@/components/app/PageHeader';
import Reveal from '@/components/marketing/Reveal';
import { StatusPill } from '@/components/app/primitives';
import InterviewHero from '../components/interview/InterviewHero';
import InterviewTypeCard from '../components/interview/InterviewTypeCard';
import InterviewSessionsPanel from '../components/interview/InterviewSessionsPanel';
import InterviewActiveInterface from '../components/interview/InterviewActiveInterface';
import CreditCheckModal from '../components/CreditCheckModal';
import { Laptop, Code } from 'lucide-react';

export interface TranscriptEntry {
  speaker: 'AI' | 'User';
  text: string;
  timestamp: string;
}

const InterviewCopilot = () => {
  const [selectedType, setSelectedType] = useState('general');
  const [completedInterviews, setCompletedInterviews] = useState<Array<{
    id: string;
    type: string;
    date: string;
    duration: string;
    status: string;
  }>>([]);
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [showInterviewInterface, setShowInterviewInterface] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [userIsSpeaking, setUserIsSpeaking] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const navigate = useNavigate();
  const { hasCredits, refetch: refetchSubscription } = useSubscription();
  
  const {
    formattedTimeRemaining,
    deductCreditForStart,
    startInterviewTimer,
    endInterview,
  } = useInterviewCredits();


  const conversation = useConversation({
    micMuted,
    onConnect: () => {
      console.log('✅ Successfully connected to ElevenLabs Conversational AI');
      const newSessionId = `interview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      setIsInterviewActive(true);
      setConnectionStatus('connected');
      toast({
        title: "Interview Started",
        description: "Connected to AI interviewer successfully"
      });
    },
    onDisconnect: async () => {
      console.log('🔌 Disconnected from ElevenLabs Conversational AI');
      setIsInterviewActive(false);
      setConnectionStatus('disconnected');
      setUserIsSpeaking(false);
      
      // Handle credit refund/deduction based on duration
      const { wasEarlyDisconnect } = await endInterview();
      
      // Process interview end when disconnecting
      if (transcript.length > 0 && sessionId) {
        try {
          await processInterviewEnd(sessionId, transcript, selectedType);
          
          if (wasEarlyDisconnect) {
            toast({
              title: "Interview Ended Early",
              description: "0.7 credit has been saved for your next interview."
            });
          } else {
            toast({
              title: "Interview Completed",
              description: "Your interview has been saved and analyzed successfully."
            });
          }
          
          refetchSubscription();
        } catch (error) {
          console.error('❌ Error processing interview end:', error);
          toast({
            title: "Save Error",
            description: "Interview ended but failed to save data.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Interview Ended",
          description: "Disconnected from AI interviewer"
        });
      }
    },
    onMessage: message => {
      console.log('📨 Message received:', message);
      const currentTime = new Date().toLocaleTimeString();
      if (message.source === 'ai') {
        console.log('🤖 AI message:', message.message);
        setUserIsSpeaking(false);
        setTranscript(prev => [...prev, {
          speaker: 'AI',
          text: message.message,
          timestamp: currentTime
        }]);
      } else if (message.source === 'user') {
        console.log('👤 User message:', message.message);
        setUserIsSpeaking(true);
        setTranscript(prev => [...prev, {
          speaker: 'User',
          text: message.message,
          timestamp: currentTime
        }]);

        setTimeout(() => {
          setUserIsSpeaking(false);
        }, 1000);
      }
    },
    onError: error => {
      console.error('❌ ElevenLabs Conversation error:', error);
      setIsInterviewActive(false);
      setConnectionStatus('error');
      setUserIsSpeaking(false);

      let errorMessage = 'Unknown error';
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        const errorObj = error as any;
        if (errorObj.message && typeof errorObj.message === 'string') {
          errorMessage = errorObj.message;
        } else if (errorObj.reason && typeof errorObj.reason === 'string') {
          errorMessage = errorObj.reason;
        } else {
          errorMessage = String(error);
        }
      }
      toast({
        title: "Interview Error",
        description: `Connection error: ${errorMessage}`,
        variant: "destructive"
      });
    }
  });

  const interviewTypes = [{
    id: 'general',
    name: 'General Interview',
    icon: Laptop,
    description: 'Standard behavioral and situational questions'
  }, {
    id: 'coding',
    name: 'Coding Interview',
    icon: Code,
    description: 'Technical programming challenges and algorithms'
  }];

  const handleSelectInterview = async (type: string) => {
    // Check credits before allowing interview selection
    if (!hasCredits) {
      setShowCreditModal(true);
      return;
    }

    if (type === 'coding') {
      navigate('/interview-copilot/coding');
    } else if (type === 'general') {
      setSelectedType(type);
      setShowInterviewInterface(true);
    }
  };

  const handleStartInterview = async () => {
    // Deduct credit at the start of interview
    const creditDeducted = await deductCreditForStart(selectedType);
    if (!creditDeducted) {
      setShowCreditModal(true);
      return;
    }

    try {
      console.log('🎤 Requesting microphone access...');
      setConnectionStatus('requesting-mic');
      await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      console.log('✅ Microphone access granted');
      setConnectionStatus('fetching-config');
      console.log('🔧 Fetching ElevenLabs configuration...');
      const {
        data,
        error
      } = await supabase.functions.invoke('get-elevenlabs-signed-url');
      if (error) {
        console.error('❌ Configuration error:', error);
        throw new Error(`Configuration error: ${error.message}`);
      }
      if (!data || !data.signedUrl) {
        console.error('❌ No signed URL received:', data);
        throw new Error('Failed to get ElevenLabs signed URL for authentication');
      }
      console.log('✅ Signed URL received for authenticated connection');
      setConnectionStatus('connecting');
      console.log('🚀 Starting authenticated session with signed URL');
      const {
        data: configData,
        error: configError
      } = await supabase.functions.invoke('get-elevenlabs-config');
      if (configError || !configData?.agentId) {
        console.error('❌ Failed to get agent ID:', configError);
        throw new Error('Failed to get agent configuration');
      }
      const conversationId = await conversation.startSession({
        signedUrl: data.signedUrl,
        connectionType: 'websocket',
      });
      console.log(`✅ ${selectedType} Interview started with conversation ID:`, conversationId);
      setConnectionStatus('connected');
      
      // Start the interview timer with auto-end callback
      startInterviewTimer(handleExitInterview);
    } catch (error) {
      console.error('❌ Error starting interview:', error);
      setIsInterviewActive(false);
      setConnectionStatus('error');
      const err = error as Error;
      if (err.name === 'NotAllowedError') {
        toast({
          title: "Microphone Access Required",
          description: "Please allow microphone access to start the interview.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Connection Error",
          description: `Failed to connect: ${err.message || 'Unknown error'}`,
          variant: "destructive"
        });
      }
    }
  };

  const handleExitInterview = async () => {
    try {
      console.log('🛑 Ending interview session...');
      
      // Handle credit refund/deduction based on duration
      const { wasEarlyDisconnect } = await endInterview();
      
      // Process interview end before closing the session
      if (transcript.length > 0 && sessionId) {
        try {
          await processInterviewEnd(sessionId, transcript, selectedType);
          
          if (wasEarlyDisconnect) {
            toast({
              title: "Interview Ended Early",
              description: "0.7 credit has been saved for your next interview."
            });
          } else {
            toast({
              title: "Interview Completed",
              description: "Your interview has been saved and analyzed successfully."
            });
          }
          
          refetchSubscription();
        } catch (error) {
          console.error('❌ Error processing interview end:', error);
          toast({
            title: "Save Error",
            description: "Interview ended but failed to save data.",
            variant: "destructive"
          });
        }
      }
      
      await conversation.endSession();
      const currentTime = new Date().toLocaleTimeString();
      setTranscript(prev => [...prev, {
        speaker: 'AI',
        text: 'Thank you for your time. The interview has concluded.',
        timestamp: currentTime
      }]);
      console.log('✅ Interview ended successfully');
    } catch (error) {
      console.error('❌ Error ending interview:', error);
      setIsInterviewActive(false);
      setConnectionStatus('disconnected');
      setUserIsSpeaking(false);
    }
  };

  const handleBackToInterviews = () => {
    setShowInterviewInterface(false);
    setIsInterviewActive(false);
    setConnectionStatus('disconnected');
    setTranscript([]);
    setUserIsSpeaking(false);
  };

  const handleClearTranscript = () => {
    setTranscript([]);
  };

  // Show interview interface for general interviews only (coding has its own page)
  if (showInterviewInterface && selectedType === 'general') {
    return (
      <ProtectedRoute>
        <InterviewActiveInterface
          selectedType={selectedType}
          connectionStatus={connectionStatus}
          userIsSpeaking={userIsSpeaking}
          isInterviewActive={isInterviewActive}
          transcript={transcript}
          conversation={conversation}
          onBack={handleBackToInterviews}
          onStartInterview={handleStartInterview}
          onExitInterview={handleExitInterview}
          onClearTranscript={handleClearTranscript}
          timeRemaining={isInterviewActive ? formattedTimeRemaining : undefined}
          isMuted={micMuted}
          onToggleMute={() => setMicMuted(prev => !prev)}
        />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-6xl mx-auto px-6 py-10 lg:py-14 space-y-16">
          <PageHeader
            eyebrow="AI Interviewer"
            title={<>Your <span className="text-spectrum">AI interviewer</span></>}
            actions={<StatusPill>ElevenLabs voice</StatusPill>}
          />

          <InterviewHero />

          {/* Interview Type Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {interviewTypes.map((type, index) => (
              <Reveal key={type.id} index={index} step={0.06}>
                <InterviewTypeCard
                  type={type}
                  isSelected={selectedType === type.id}
                  onSelect={setSelectedType}
                  onStart={handleSelectInterview}
                  index={index}
                />
              </Reveal>
            ))}
          </div>

          {/* Sessions Section */}
          <Reveal>
            <InterviewSessionsPanel
              completedInterviews={completedInterviews}
              onStartFirstInterview={() => handleSelectInterview('general')}
            />
          </Reveal>

          {/* Credit Check Modal */}
          <CreditCheckModal open={showCreditModal} onOpenChange={setShowCreditModal} />
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default InterviewCopilot;
