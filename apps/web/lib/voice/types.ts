/**
 * Real-Time Conversational Voice Streaming Suite Types.
 * Designed for sub-800ms full-duplex conversational voice turnarounds,
 * live barge-in interruptions, sentence-pipelined TTS, and audio telemetry.
 */

export type VoiceStreamingState =
  | "idle"
  | "listening"
  | "candidate_speaking"
  | "ai_thinking"
  | "ai_speaking"
  | "interrupted";

export interface AudioLatencyTelemetry {
  speechEndTimeMs: number;
  firstTokenReceivedTimeMs?: number;
  firstAudioChunkReceivedTimeMs?: number;
  totalTurnaroundLatencyMs: number; // Time from speech end to first sound emitted
  sttLatencyMs: number;
  llmFirstTokenMs: number;
  ttsFirstChunkMs: number;
}

export interface StreamingVoiceConfig {
  sampleRate: number; // 16000 or 48000 Hz
  chunkTimesliceMs: number; // 250ms for low-latency chunks
  bargeInSensitivity: number; // 0.0 to 1.0 (threshold for interrupting AI speech)
  sentencePipeliningEnabled: boolean;
  targetVoice: string; // e.g. "shashi" or "aditi"
  languageCode: string; // "en-IN"
}

export interface VoiceStreamEvent {
  type:
    | "chunk_sent"
    | "transcript_partial"
    | "transcript_final"
    | "barge_in_triggered"
    | "audio_chunk_received"
    | "turn_completed";
  timestampMs: number;
  data?: unknown;
}
