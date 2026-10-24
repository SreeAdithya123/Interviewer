import {
  AudioLatencyTelemetry,
  StreamingVoiceConfig,
  VoiceStreamEvent,
  VoiceStreamingState,
} from "./types";

export const DEFAULT_STREAMING_VOICE_CONFIG: StreamingVoiceConfig = {
  sampleRate: 16000,
  chunkTimesliceMs: 250,
  bargeInSensitivity: 0.65,
  sentencePipeliningEnabled: true,
  targetVoice: "shashi",
  languageCode: "en-IN",
};

/**
 * Splits incoming streamed LLM text into speakable sentence chunks
 * so TTS can begin audio generation on the very first complete sentence.
 */
export function splitIntoSpeakableSentences(text: string): {
  sentences: string[];
  remainder: string;
} {
  const sentenceEndPattern = /([.?!;]+(?:\s+|$))/g;
  const sentences: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = sentenceEndPattern.exec(text)) !== null) {
    const sentence = text.substring(lastIndex, match.index + match[0].length).trim();
    if (sentence.length > 0) {
      sentences.push(sentence);
    }
    lastIndex = match.index + match[0].length;
  }

  const remainder = text.substring(lastIndex);
  return { sentences, remainder };
}

/**
 * Determines whether user microphone speech should interrupt/barge-in on AI speech.
 */
export function evaluateBargeIn(
  currentAudioEnergy: number, // 0.0 to 1.0 (RMS or volume level)
  aiPlaybackActive: boolean,
  sensitivity: number = 0.65
): boolean {
  if (!aiPlaybackActive) return false;
  // Threshold inversely related to sensitivity: higher sensitivity -> lower threshold to interrupt
  const threshold = 1.0 - sensitivity * 0.7; // e.g. sensitivity 0.65 -> threshold ~0.545
  return currentAudioEnergy >= threshold;
}

/**
 * Calculates end-to-end turnaround latency from speech end to first sound.
 */
export function computeTurnaroundLatency(metrics: {
  speechEndTimeMs: number;
  firstTokenReceivedTimeMs: number;
  firstAudioChunkReceivedTimeMs: number;
}): AudioLatencyTelemetry {
  const sttLatencyMs = Math.max(
    50,
    Math.round((metrics.firstTokenReceivedTimeMs - metrics.speechEndTimeMs) * 0.45)
  );
  const llmFirstTokenMs = Math.max(
    50,
    Math.round(metrics.firstTokenReceivedTimeMs - metrics.speechEndTimeMs - sttLatencyMs)
  );
  const ttsFirstChunkMs = Math.max(
    100,
    Math.round(metrics.firstAudioChunkReceivedTimeMs - metrics.firstTokenReceivedTimeMs)
  );
  const totalTurnaroundLatencyMs = Math.max(
    150,
    metrics.firstAudioChunkReceivedTimeMs - metrics.speechEndTimeMs
  );

  return {
    speechEndTimeMs: metrics.speechEndTimeMs,
    firstTokenReceivedTimeMs: metrics.firstTokenReceivedTimeMs,
    firstAudioChunkReceivedTimeMs: metrics.firstAudioChunkReceivedTimeMs,
    totalTurnaroundLatencyMs,
    sttLatencyMs,
    llmFirstTokenMs,
    ttsFirstChunkMs,
  };
}

/**
 * Client-side Voice Stream Session Orchestrator.
 */
export class VoiceStreamSession {
  private state: VoiceStreamingState = "idle";
  private config: StreamingVoiceConfig;
  private listeners: ((event: VoiceStreamEvent) => void)[] = [];
  private accumulatedTokens: string = "";
  private pendingSentences: string[] = [];

  constructor(config: StreamingVoiceConfig = DEFAULT_STREAMING_VOICE_CONFIG) {
    this.config = config;
  }

  public getState(): VoiceStreamingState {
    return this.state;
  }

  public onEvent(callback: (event: VoiceStreamEvent) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private emit(type: VoiceStreamEvent["type"], data?: unknown) {
    const event: VoiceStreamEvent = {
      type,
      timestampMs: Date.now(),
      data,
    };
    this.listeners.forEach((cb) => cb(event));
  }

  public startListening() {
    this.state = "listening";
    this.accumulatedTokens = "";
    this.pendingSentences = [];
    this.emit("turn_completed", { state: this.state });
  }

  public handleCandidateSpeechDetected() {
    this.state = "candidate_speaking";
  }

  public handleCandidateSpeechEnded() {
    this.state = "ai_thinking";
    this.emit("transcript_final", { state: this.state });
  }

  public handleIncomingLlmToken(token: string): string[] {
    this.accumulatedTokens += token;
    if (!this.config.sentencePipeliningEnabled) return [];

    const { sentences, remainder } = splitIntoSpeakableSentences(this.accumulatedTokens);
    if (sentences.length > 0) {
      this.accumulatedTokens = remainder;
      this.pendingSentences.push(...sentences);
      if (this.state !== "ai_speaking") {
        this.state = "ai_speaking";
      }
      return sentences;
    }
    return [];
  }

  public handleBargeInCheck(audioEnergy: number): boolean {
    const isInterrupted = evaluateBargeIn(
      audioEnergy,
      this.state === "ai_speaking",
      this.config.bargeInSensitivity
    );

    if (isInterrupted) {
      this.state = "interrupted";
      this.accumulatedTokens = "";
      this.pendingSentences = [];
      this.emit("barge_in_triggered", { energy: audioEnergy });
    }

    return isInterrupted;
  }
}
