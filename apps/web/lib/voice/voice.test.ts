import { describe, expect, it } from "vitest";
import {
  computeTurnaroundLatency,
  evaluateBargeIn,
  splitIntoSpeakableSentences,
  VoiceStreamSession,
} from "./streamManager";

describe("Real-Time Voice Streaming & Low-Latency Turnaround Engine", () => {
  it("splits incoming streaming text into speakable sentences immediately", () => {
    const chunk1 = "That is a great explanation of hash map buckets. ";
    const res1 = splitIntoSpeakableSentences(chunk1);
    expect(res1.sentences).toEqual(["That is a great explanation of hash map buckets."]);
    expect(res1.remainder).toBe("");

    const chunk2 = "Now consider this question: what happens if two keys produce the same hash? Can you explain";
    const res2 = splitIntoSpeakableSentences(chunk2);
    expect(res2.sentences).toEqual([
      "Now consider this question: what happens if two keys produce the same hash?",
    ]);
    expect(res2.remainder).toBe("Can you explain");
  });

  it("evaluates barge-in interruption correctly based on energy and AI state", () => {
    // If AI is not speaking, high energy is just normal speech, not barge-in
    expect(evaluateBargeIn(0.9, false)).toBe(false);

    // If AI is speaking and user speaks loudly (energy 0.8), triggers barge-in
    expect(evaluateBargeIn(0.8, true, 0.65)).toBe(true);

    // If AI is speaking but background noise is quiet (energy 0.1), does not interrupt
    expect(evaluateBargeIn(0.1, true, 0.65)).toBe(false);
  });

  it("computes end-to-end turnaround latency and STT/LLM/TTS breakdown", () => {
    const speechEnd = 10000;
    const firstToken = 10320; // 320ms for STT + LLM start
    const firstAudio = 10680; // 680ms total turnaround (under 800ms target!)

    const latency = computeTurnaroundLatency({
      speechEndTimeMs: speechEnd,
      firstTokenReceivedTimeMs: firstToken,
      firstAudioChunkReceivedTimeMs: firstAudio,
    });

    expect(latency.totalTurnaroundLatencyMs).toBe(680);
    expect(latency.totalTurnaroundLatencyMs).toBeLessThan(800);
    expect(latency.ttsFirstChunkMs).toBe(360);
  });

  it("manages conversational session state machine and sentence pipelining", () => {
    const session = new VoiceStreamSession();
    expect(session.getState()).toBe("idle");

    session.startListening();
    expect(session.getState()).toBe("listening");

    session.handleCandidateSpeechDetected();
    expect(session.getState()).toBe("candidate_speaking");

    session.handleCandidateSpeechEnded();
    expect(session.getState()).toBe("ai_thinking");

    // Stream LLM tokens piece by piece
    const sentences1 = session.handleIncomingLlmToken("Well ");
    expect(sentences1).toEqual([]);

    const sentences2 = session.handleIncomingLlmToken("done! Next question: ");
    expect(sentences2).toEqual(["Well done!"]);
    expect(session.getState()).toBe("ai_speaking");

    // Candidate speaks over AI -> triggers interruption
    const interrupted = session.handleBargeInCheck(0.85);
    expect(interrupted).toBe(true);
    expect(session.getState()).toBe("interrupted");
  });
});
