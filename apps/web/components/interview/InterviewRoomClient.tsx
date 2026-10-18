"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, StatusPill } from "@/components/interview/primitives";
import { finishInterview, getNextTurn, submitAnswer } from "@/lib/interview/actions";
import { saveTurnAudio } from "@/lib/interview/audio-store";
import type { EngineNextTurn } from "@/lib/interview/engine-client";
import { MAX_ANSWER_SECONDS, MAX_INTERVIEW_SECONDS } from "@/lib/interview/constants";
import { formatClock, pickSupportedMimeType } from "@/lib/interview/recording";
import { DIFFICULTY_LABELS, INTERVIEW_TYPE_LABELS, STAGE_LABELS } from "@/lib/interview/types";
import type { Interview, InterviewStage } from "@/lib/interview/types";

type Phase =
  | "starting"
  | "thinking"
  | "awaiting_recording"
  | "requesting_mic"
  | "recording"
  | "saving_turn"
  | "finishing"
  | "done"
  | "error";

interface AnsweredTurn {
  turnNumber: number | null;
  stage: InterviewStage;
  questionText: string;
  transcript: string;
  isFollowUp: boolean;
  answerDurationSeconds: number;
  hasAudio: boolean;
}

/** Minimal shape this component needs from @ricky0123/vad-web's MicVAD,
 * so the rest of the file doesn't depend on that package's exact types
 * (it's loaded dynamically, client-side only — see startRecording below). */
interface MicVADLike {
  start: () => void;
  destroy: () => void;
}

const VAD_VERSION = "0.0.24";
const ORT_VERSION = "1.14.0";

/** Pre-recorded acknowledgement clips (BUILD_SPEC Part 4.5 step 6: "While
 * waiting, the browser plays a short pre-recorded acknowledgement clip so
 * the gap feels natural"). Real Sarvam Bulbul v3 TTS output, synthesized
 * once and bundled as static files — not a live per-turn synthesis call. */
const ACKNOWLEDGEMENT_CLIPS = ["/audio/ack-1.wav", "/audio/ack-2.wav", "/audio/ack-3.wav"];

export function InterviewRoomClient({ interview }: { interview: Interview }) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("starting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentTurn, setCurrentTurn] = useState<EngineNextTurn | null>(null);
  const [answered, setAnswered] = useState<AnsweredTurn[]>([]);
  const [overallRemaining, setOverallRemaining] = useState(MAX_INTERVIEW_SECONDS);
  const [answerRemaining, setAnswerRemaining] = useState(MAX_ANSWER_SECONDS);
  const [vadStatus, setVadStatus] = useState<"unavailable" | "loading" | "active" | "off">("off");

  // Set from the mount effect below, not here — `Date.now()` is an impure
  // call and must not run during render (react-hooks/purity).
  const sessionStartRef = useRef<number>(0);
  const answerStartRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const vadRef = useRef<MicVADLike | null>(null);
  const discardStopRef = useRef(false);
  const finishedRef = useRef(false);
  const lastAckClipIndexRef = useRef<number | null>(null);
  // Guards the mount effect below against React's dev-mode double-invoke
  // (mount -> cleanup -> mount again, same tick). A `cancelled` flag alone
  // only stops a stale *result* from being applied — it doesn't stop the
  // first invocation's call from actually reaching the server, which, for
  // the first turn, really does create it and can really finish the
  // interview server-side before that result is ever applied client-side.
  // This ref isn't reset in the effect's cleanup, so it survives the
  // synchronous remount and the second invocation skips firing a second
  // real request; a genuine unmount (navigating away) gets a fresh
  // component instance with a fresh ref regardless.
  const mountEffectStartedRef = useRef(false);

  const playAcknowledgementClip = useCallback(() => {
    if (ACKNOWLEDGEMENT_CLIPS.length === 0) return;
    let index = Math.floor(Math.random() * ACKNOWLEDGEMENT_CLIPS.length);
    if (ACKNOWLEDGEMENT_CLIPS.length > 1 && index === lastAckClipIndexRef.current) {
      index = (index + 1) % ACKNOWLEDGEMENT_CLIPS.length;
    }
    lastAckClipIndexRef.current = index;
    const audio = new Audio(ACKNOWLEDGEMENT_CLIPS[index]);
    audio.volume = 0.85;
    // Autoplay can still be blocked in some browser states even after prior
    // user interaction (mic grant); this is a nice-to-have, not a required
    // step, so a rejected play() is silently ignored rather than surfaced.
    void audio.play().catch(() => {});
  }, []);

  const interviewId = interview.id;

  const cleanupMediaResources = useCallback(() => {
    vadRef.current?.destroy();
    vadRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    setVadStatus("off");
  }, []);

  const finishNow = useCallback(
    async (overrideDurationSeconds?: number) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      cleanupMediaResources();
      setPhase("finishing");
      void overrideDurationSeconds; // kept for the 25-minute-cap call site below; the engine times itself

      try {
        await finishInterview(interviewId);
        setPhase("done");
        router.push(`/app/interview/${interviewId}/report`);
      } catch (err) {
        finishedRef.current = false;
        setPhase("error");
        setErrorMessage(err instanceof Error ? err.message : "Could not finish the interview.");
      }
    },
    [cleanupMediaResources, interviewId, router],
  );

  /** Applies whatever the engine said comes next: either the interview is
   * over (go finish it) or there's a real question to render. */
  const applyNextTurn = useCallback(
    async (next: EngineNextTurn) => {
      if (next.interview_finished) {
        await finishNow();
        return;
      }
      setCurrentTurn(next);
      setAnswerRemaining(MAX_ANSWER_SECONDS);
      setPhase("awaiting_recording");
    },
    [finishNow],
  );

  const loadNextTurn = useCallback(async () => {
    setPhase("thinking");
    setErrorMessage(null);
    try {
      const next = await getNextTurn(interviewId);
      await applyNextTurn(next);
    } catch (err) {
      setPhase("error");
      setErrorMessage(err instanceof Error ? err.message : "Could not load the next question.");
    }
  }, [applyNextTurn, interviewId]);

  // Kick off: the engine's own `/turns/next` flips a `pending` interview to
  // `in_progress` and opens its first stage on the first call — no separate
  // "start" step needed. Runs once per mount. Inline async IIFE (not a call
  // to the `loadNextTurn` callback above) so `setPhase`'s first, synchronous
  // call lives inside a plain function the effect itself owns, not inside a
  // separately-defined useCallback — react-hooks/set-state-in-effect flags
  // the latter shape as a cascading-render risk even though both run
  // identically here; a `cancelled` guard still skips a late state update
  // from an unmounted component the same way it did before this rewrite.
  useEffect(() => {
    if (mountEffectStartedRef.current) return;
    mountEffectStartedRef.current = true;
    let cancelled = false;
    sessionStartRef.current = Date.now();
    (async () => {
      setPhase("thinking");
      setErrorMessage(null);
      try {
        const next = await getNextTurn(interviewId);
        if (cancelled) return;
        await applyNextTurn(next);
      } catch (err) {
        if (cancelled) return;
        setPhase("error");
        setErrorMessage(err instanceof Error ? err.message : "Could not load the next question.");
      }
    })();
    return () => {
      cancelled = true;
      cleanupMediaResources();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run once on mount
  }, []);

  // Overall 25-minute cap (BUILD_SPEC Part 4.5: "interviews at 25 minutes").
  // The engine enforces this for real server-side too; this just moves the
  // UI along without waiting for an answer that was never going to be submitted.
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Math.round((Date.now() - sessionStartRef.current) / 1000);
      const remaining = MAX_INTERVIEW_SECONDS - elapsed;
      setOverallRemaining(remaining);
      if (remaining <= 0 && (phase === "recording" || phase === "awaiting_recording") && !finishedRef.current) {
        void finishNow(MAX_INTERVIEW_SECONDS);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [finishNow, phase]);

  const saveCurrentTurn = useCallback(
    async (blob: Blob | null, answerDurationSeconds: number) => {
      const turn = currentTurn;
      if (!turn || !turn.turn_id) return;

      setPhase("saving_turn");
      setErrorMessage(null);

      // In-memory, same-tab only (lib/interview/audio-store.ts) — there is
      // no R2 upload wired into this submission path yet (the engine's
      // submit_answer still takes raw bytes, not an R2 key; see
      // docs/DECISIONS.md), so this is the same limitation the stub room
      // already had, not a new one, now that R2 itself is live.
      if (blob && turn.turn_number != null) saveTurnAudio(interviewId, turn.turn_number, blob);

      try {
        const form = new FormData();
        form.append("interviewId", interviewId);
        form.append("turnId", turn.turn_id);
        form.append("answerDurationSeconds", String(answerDurationSeconds));
        // The engine rejects a missing file, so an empty recording (mic
        // granted but no audio captured) still sends a zero-byte blob
        // rather than silently skipping the submission.
        form.append("audio", blob ?? new Blob([], { type: "audio/webm" }), "answer.webm");

        const result = await submitAnswer(form);

        setAnswered((prev) => [
          ...prev,
          {
            turnNumber: turn.turn_number,
            stage: turn.stage ?? "intro",
            questionText: turn.question_text ?? "",
            transcript: result.transcript,
            isFollowUp: turn.is_follow_up,
            answerDurationSeconds,
            hasAudio: blob !== null && blob.size > 0,
          },
        ]);

        await applyNextTurn(result.next_turn);
      } catch (err) {
        setPhase("error");
        setErrorMessage(err instanceof Error ? err.message : "Could not save that answer.");
      }
    },
    [applyNextTurn, currentTurn, interviewId],
  );

  const stopRecording = useCallback(
    (discard: boolean) => {
      discardStopRef.current = discard;
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
    },
    [],
  );

  const startRecording = useCallback(async () => {
    setErrorMessage(null);
    setPhase("requesting_mic");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      discardStopRef.current = false;

      const mimeType = pickSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const wasDiscarded = discardStopRef.current;
        const durationSeconds = Math.max(0, (Date.now() - answerStartRef.current) / 1000);
        const blob = chunksRef.current.length > 0 ? new Blob(chunksRef.current, { type: mimeType || "audio/webm" }) : null;
        vadRef.current?.destroy();
        vadRef.current = null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setVadStatus("off");
        if (!wasDiscarded) {
          playAcknowledgementClip();
          void saveCurrentTurn(blob, durationSeconds);
        }
      };

      recorder.start();
      answerStartRef.current = Date.now();
      setAnswerRemaining(MAX_ANSWER_SECONDS);
      setPhase("recording");

      // Silero VAD (@ricky0123/vad-web) for end-of-answer detection, per
      // BUILD_SPEC Part 4.5 step 3. Loaded dynamically (client-only,
      // AudioWorklet-based) and treated as purely optional: the manual
      // "Done answering" button always works even if this never loads or
      // errors out, which is also the only path we can exercise in a
      // headless/CI browser (no real microphone/AudioWorklet there).
      setVadStatus("loading");
      try {
        const { MicVAD } = await import("@ricky0123/vad-web");
        const vad = await MicVAD.new({
          stream,
          baseAssetPath: `https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@${VAD_VERSION}/dist/`,
          onnxWASMBasePath: `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`,
          onSpeechEnd: () => {
            stopRecording(false);
          },
        });
        vadRef.current = vad;
        vad.start();
        setVadStatus("active");
      } catch {
        setVadStatus("unavailable");
      }
    } catch (err) {
      setPhase("error");
      setErrorMessage(
        err instanceof Error
          ? `Microphone access failed: ${err.message}`
          : "Microphone access failed. Check your browser's microphone permission and try again.",
      );
    }
  }, [playAcknowledgementClip, saveCurrentTurn, stopRecording]);

  // Per-answer 180-second cap.
  useEffect(() => {
    if (phase !== "recording") return;
    const id = setInterval(() => {
      const elapsed = (Date.now() - answerStartRef.current) / 1000;
      const remaining = MAX_ANSWER_SECONDS - elapsed;
      setAnswerRemaining(remaining);
      if (remaining <= 0) {
        stopRecording(false);
      }
    }, 250);
    return () => clearInterval(id);
  }, [phase, stopRecording]);

  async function handleEndInterviewNow() {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "End this interview now? You'll get a report based on the questions you've already answered.",
      );
      if (!confirmed) return;
    }
    if (phase === "recording") stopRecording(true);
    await finishNow();
  }

  if (phase === "error") {
    return (
      <div className="max-w-3xl space-y-4">
        <Card>
          <h2 className="font-headline text-lg font-semibold text-foreground">Something went wrong</h2>
          <p className="mt-2 font-body text-sm text-destructive">{errorMessage}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="btn-primary" onClick={() => loadNextTurn()}>
              Try that again
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => router.push(`/app/interview/${interviewId}/report`)}
            >
              Go to report
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
            {INTERVIEW_TYPE_LABELS[interview.interview_type]} interview
            {interview.target_role ? ` · ${interview.target_role}` : ""}
          </h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            {DIFFICULTY_LABELS[interview.difficulty]} difficulty
            {interview.company_type ? ` · ${interview.company_type}` : ""}
          </p>
        </div>
        <StatusPill tone={overallRemaining < 120 ? "warning" : "neutral"}>
          {formatClock(overallRemaining)} left
        </StatusPill>
      </div>

      <Card>
        {phase === "starting" && <StatusLine text="Starting your interview..." />}
        {phase === "thinking" && <StatusLine text="Preparing the next question..." pulse />}
        {phase === "finishing" && <StatusLine text="Wrapping up and generating your report..." pulse />}

        {currentTurn && (phase === "awaiting_recording" || phase === "recording" || phase === "requesting_mic" || phase === "saving_turn") && (
          <div>
            <div className="flex items-center justify-between gap-3">
              <StatusPill>{STAGE_LABELS[currentTurn.stage ?? "intro"]}</StatusPill>
              <span className="font-body text-xs text-muted-foreground">
                Question {answered.length + 1}
                {currentTurn.is_follow_up ? " · follow-up" : ""}
              </span>
            </div>

            <p className="mt-4 font-body text-lg leading-body text-foreground">{currentTurn.question_text}</p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              {phase === "awaiting_recording" && (
                <button type="button" className="btn-primary" onClick={startRecording}>
                  Start recording my answer
                </button>
              )}

              {phase === "requesting_mic" && <StatusLine text="Requesting microphone access..." />}

              {phase === "recording" && (
                <>
                  <StatusPill tone="live">Recording</StatusPill>
                  <span className="font-metric text-sm text-foreground">{formatClock(answerRemaining)} left to answer</span>
                  <button type="button" className="btn-secondary" onClick={() => stopRecording(false)}>
                    Done answering
                  </button>
                  {vadStatus === "active" && (
                    <span className="font-body text-xs text-muted-foreground">
                      Auto-stop on silence is on — or tap Done.
                    </span>
                  )}
                  {vadStatus === "loading" && (
                    <span className="font-body text-xs text-muted-foreground">Loading auto-stop detection...</span>
                  )}
                  {vadStatus === "unavailable" && (
                    <span className="font-body text-xs text-muted-foreground">
                      Auto-stop detection unavailable here — tap Done when you&apos;re finished.
                    </span>
                  )}
                </>
              )}

              {phase === "saving_turn" && <StatusLine text="Transcribing and saving your answer..." />}
            </div>
          </div>
        )}
      </Card>

      {answered.length > 0 && (
        <Card>
          <h2 className="font-headline text-lg font-semibold text-foreground">So far this interview</h2>
          <ol className="mt-4 space-y-3">
            {answered.map((turn, index) => (
              <li key={turn.turnNumber ?? index} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-body text-xs font-medium text-muted-foreground">
                    {STAGE_LABELS[turn.stage]}
                    {turn.isFollowUp ? " · follow-up" : ""}
                  </span>
                  <span className="font-metric text-xs text-muted-foreground">
                    {formatClock(turn.answerDurationSeconds)}
                  </span>
                </div>
                <p className="mt-2 font-body text-sm font-medium text-foreground">{turn.questionText}</p>
                <p className="mt-1 font-body text-sm text-muted-foreground">{turn.transcript}</p>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="text-center">
        <button type="button" onClick={handleEndInterviewNow} className="font-body text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
          End interview now
        </button>
      </div>
    </div>
  );
}

function StatusLine({ text, pulse = false }: { text: string; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-3 font-body text-sm text-muted-foreground">
      <span className={`h-2 w-2 rounded-full bg-primary ${pulse ? "animate-pulse" : ""}`} />
      {text}
    </div>
  );
}

export default InterviewRoomClient;
