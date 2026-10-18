"""Internal manual test harness for a full, real, end-to-end interview.

BUILD_SPEC.md Part 7, Phase 1: "Minimal internal page (no styling needed)
that runs a full 20-minute-style turn-based interview end to end with real
providers." This is explicitly an internal engine-testing tool -- separate
from the real product UI in apps/web -- so it lives here, served by the
engine itself at GET /internal/test-interview, instead of in the Next.js app.

It is a thin manual-testing harness, not a new code path: the page is plain
HTML + vanilla JS that calls the engine's own real HTTP routes with
fetch(), does basic browser audio capture with MediaRecorder, and renders
whatever the engine returns -- including the raw JSON of every response --
so a human (or a script, using the synthetic-silence fallback described
below) can click through one real interview once provider keys exist.
Nothing here is mocked.

Routes this page calls, confirmed directly against `app/main.py` /
`app/interview/engine.py` as they exist today (see the ENDPOINTS table and
comments in the embedded <script> below for the exact request/response
shapes):

  - POST /interviews/{interview_id}/turns/next
    No body. Returns the next thing to ask (or that the interview is
    finished) -- this doubles as "give me the first question" the first
    time it's called for a given interview.
  - POST /interviews/{interview_id}/turns/{turn_id}/answer
    multipart/form-data: `audio` (the recorded clip) + `answer_duration_seconds`.
    Transcribes the answer (Groq, falling back to Sarvam) and returns the
    transcript plus the next turn in one response.
  - POST /interviews/{interview_id}/finish
    No body. Ends the interview and runs the real evaluation report
    synchronously (see `engine.finish_interview`'s own docstring) -- so by
    the time this call returns, `interview_reports` already has the result.

Two pieces this page needs are not yet exposed over HTTP as of this
writing: creating an interview, and reading the finished report back. The
page still offers best-effort buttons for both (`POST /interviews`, `GET
/interviews/{id}/report`) in case they land later, with a manual-entry
fallback for the interview id (e.g. one inserted directly via SQL/Supabase
for a test run) and a note to read `interview_reports` directly otherwise.
If any of the shapes above change, only the ENDPOINTS table and the few
field names read out of each response inside the page's <script> need to
change -- nothing else here is coupled to them.
"""

import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["internal"])


@router.get("/internal/test-interview", include_in_schema=False)
def serve_manual_test_interview_page() -> HTMLResponse:
    """Serve the manual interview test harness.

    This is a developer tool with no authentication of its own (the page
    itself just calls the real, auth-checked engine routes), so it is
    gated off when ENVIRONMENT=production rather than shipped to real
    users.
    """
    if os.environ.get("ENVIRONMENT") == "production":
        raise HTTPException(status_code=404)
    return HTMLResponse(content=_PAGE_HTML)


_PAGE_HTML = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Interview engine -- manual test harness</title>
</head>
<body>
<h1>Interview engine -- manual test harness (internal, no styling)</h1>
<p>
  BUILD_SPEC.md Part 7, Phase 1. Click through one real, end-to-end
  interview against the engine's real routes below -- nothing on this page
  is mocked. Needs a real microphone (or the "Submit synthetic silence"
  fallback below, which really does send a short real WAV clip of silence)
  and real provider keys in <code>services/engine/.env</code>; see
  <code>services/engine/README.md</code> for the full run-through.
</p>

<h2>0. Config</h2>
<p>
  <label>Base URL (blank = same origin as this page):
    <input id="baseUrl" size="40" placeholder="http://localhost:8000" />
  </label>
</p>
<p>
  <label>Bearer token (optional -- only needed if the engine checks a real Supabase JWT):
    <input id="bearerToken" size="60" />
  </label>
</p>

<h2>1. Get an interview id</h2>
<p>
  There is no HTTP route to create an interview as of this writing (only
  the turn loop is wired up). Try the button below in case one has landed
  since; otherwise paste an existing <code>interviews.id</code> (e.g. one
  you inserted directly via SQL/Supabase with a real <code>user_id</code>
  and <code>template_id</code>) into the field and click "Use this id".
</p>
<p>
  <label>Interview type: <select id="interviewType">
    <option>hr</option><option selected>technical</option><option>behavioral</option><option>mixed</option>
  </select></label>
</p>
<p><label>Target role: <input id="targetRole" value="Software Engineer" /></label></p>
<p><label>Company type: <input id="companyType" value="product" /></label></p>
<p>
  <label>Difficulty: <select id="difficulty">
    <option>easy</option><option selected>medium</option><option>hard</option>
  </select></label>
</p>
<p><label>Template id (optional): <input id="templateId" /></label></p>
<p><label>User id (optional): <input id="userId" /></label></p>
<p><label>College id (optional): <input id="collegeId" /></label></p>
<p><button id="btnCreate">Try POST /interviews</button></p>
<p>
  <label>...or an existing interview id: <input id="manualInterviewId" size="40" /></label>
  <button id="btnUseManualId">Use this id</button>
</p>
<p>Interview id in use: <code id="interviewIdOut">(none yet)</code></p>

<h2>2. Current turn</h2>
<p><button id="btnNextTurn" disabled>POST .../turns/next (get current/next question)</button></p>
<pre id="turnSummary">(no turn yet)</pre>

<h2>3. Record + submit your answer</h2>
<p>
  <button id="btnRecordStart" disabled>Start recording</button>
  <button id="btnRecordStop" disabled>Stop recording</button>
</p>
<p id="recordStatus"></p>
<p><audio id="answerAudio" controls></audio></p>
<p>
  <button id="btnSubmitTurn" disabled>Submit recorded answer</button>
  <button id="btnSubmitSilence" disabled title="Generates a real (silent) WAV clip client-side and submits it -- for scripts/agents to self-test without a human or a microphone, per BUILD_SPEC.md Part 7's own suggestion.">
    Submit synthetic silence (no mic needed)
  </button>
</p>

<h2>4. Finish + report</h2>
<p>
  Finishing runs the real evaluation call synchronously, so the report
  should already exist in <code>interview_reports</code> by the time this
  returns.
</p>
<p>
  <button id="btnFinish" disabled>POST .../finish</button>
  <button id="btnCheckReport" disabled title="Speculative -- no GET report route exists as of this writing; may 404.">
    Try GET .../report
  </button>
</p>
<pre id="reportOut"></pre>

<h2>Log</h2>
<pre id="log" style="height: 300px; overflow: auto; border: 1px solid #888; padding: 8px;"></pre>

<script>
// ---------------------------------------------------------------------------
// Real engine routes this page calls -- edit here if they end up named
// differently. Nothing else in this page is coupled to the exact path
// strings. Confirmed against app/main.py + app/interview/engine.py:
//   - nextTurn: POST, no body -> NextTurnResult (interview_finished,
//     turn_id, turn_number, stage, question_text, question_source,
//     question_bank_id, is_follow_up, follow_up_of_turn_id).
//   - submitAnswer: POST multipart/form-data (`audio` file +
//     `answer_duration_seconds` form field) -> SubmitAnswerResponse
//     (turn_id, transcript, stt_provider, stt_fallback_used, next_turn).
//   - finishInterview: POST, no body -> {status}.
//   - createInterview / getReport: speculative, not confirmed to exist yet.
// ---------------------------------------------------------------------------
const ENDPOINTS = {
  createInterview: () => "/interviews",
  nextTurn: (interviewId) => `/interviews/${interviewId}/turns/next`,
  submitAnswer: (interviewId, turnId) => `/interviews/${interviewId}/turns/${turnId}/answer`,
  finishInterview: (interviewId) => `/interviews/${interviewId}/finish`,
  getReport: (interviewId) => `/interviews/${interviewId}/report`,
};

const state = {
  interviewId: null,
  currentTurn: null, // last NextTurnResult-shaped object seen
  mediaRecorder: null,
  recordedChunks: [],
  recordedBlob: null,
  recordStartedAt: null,
  recordedDurationSeconds: null,
};

function log(label, detail) {
  const el = document.getElementById("log");
  const ts = new Date().toISOString();
  const line = detail === undefined ? `[${ts}] ${label}` : `[${ts}] ${label}: ${JSON.stringify(detail)}`;
  el.textContent += line + "\\n";
  el.scrollTop = el.scrollHeight;
}

function baseUrl() {
  return document.getElementById("baseUrl").value.trim();
}

function authHeaders() {
  const token = document.getElementById("bearerToken").value.trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path, options = {}) {
  const url = baseUrl() + path;
  const headers = Object.assign({}, authHeaders(), options.headers || {});
  log("REQUEST", { method: options.method || "GET", url, body: options.bodyForLog });
  const response = await fetch(url, Object.assign({}, options, { headers }));
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text;
  }
  log("RESPONSE", { url, status: response.status, data });
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} -> HTTP ${response.status}: ${text}`);
  }
  return data;
}

function postJson(path, body) {
  return apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    bodyForLog: body,
  });
}

function postEmpty(path) {
  return apiFetch(path, { method: "POST", bodyForLog: null });
}

// Builds a real (silent) mono 16kHz PCM WAV file entirely client-side --
// no network call, no microphone. BUILD_SPEC.md Part 7 explicitly allows
// synthetic test audio ("you can generate synthetic audio for others ...
// even silence") for interviews a human doesn't click through themselves;
// this is that option, built into the harness so a script can drive a full
// interview with no human and no real mic.
function createSilentWavBlob(durationSeconds) {
  const sampleRate = 16000;
  const numSamples = Math.max(1, Math.round(durationSeconds * sampleRate));
  const dataSize = numSamples * 2; // 16-bit mono PCM
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM fmt chunk size
  view.setUint16(20, 1, true); // audio format = PCM
  view.setUint16(22, 1, true); // channels = mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, dataSize, true);
  // PCM sample bytes are already zero-initialized by ArrayBuffer -> silence.
  return new Blob([buffer], { type: "audio/wav" });
}

function setButtonsForTurn(turn) {
  const finished = Boolean(turn && turn.interview_finished);
  document.getElementById("btnRecordStart").disabled = finished;
  document.getElementById("btnSubmitTurn").disabled = true; // re-enabled once a clip is recorded
  document.getElementById("btnSubmitSilence").disabled = finished;
  document.getElementById("btnFinish").disabled = false;
  document.getElementById("btnNextTurn").disabled = false;
}

function renderTurn(turn) {
  state.currentTurn = turn;
  const el = document.getElementById("turnSummary");
  if (!turn) {
    el.textContent = "(no turn yet)";
    return;
  }
  const lines = [];
  if (turn.turn_number !== undefined && turn.turn_number !== null) lines.push(`turn_number: ${turn.turn_number}`);
  if (turn.stage) lines.push(`stage: ${turn.stage}`);
  if (turn.is_follow_up !== undefined) lines.push(`is_follow_up: ${turn.is_follow_up}`);
  if (turn.question_text) lines.push(`question: ${turn.question_text}`);
  if (turn.interview_finished) lines.push("-- interview_finished: true (go finish + check the report) --");
  lines.push("");
  lines.push("Raw response:");
  lines.push(JSON.stringify(turn, null, 2));
  el.textContent = lines.join("\\n");
  setButtonsForTurn(turn);
}

function enableInterviewId(id) {
  state.interviewId = id;
  document.getElementById("interviewIdOut").textContent = id || "(none yet)";
  document.getElementById("btnNextTurn").disabled = !id;
  document.getElementById("btnFinish").disabled = !id;
  document.getElementById("btnCheckReport").disabled = !id;
}

document.getElementById("btnCreate").addEventListener("click", async () => {
  try {
    const body = {
      interview_type: document.getElementById("interviewType").value,
      target_role: document.getElementById("targetRole").value || null,
      company_type: document.getElementById("companyType").value || null,
      difficulty: document.getElementById("difficulty").value,
    };
    const templateId = document.getElementById("templateId").value.trim();
    if (templateId) body.template_id = templateId;
    const userId = document.getElementById("userId").value.trim();
    if (userId) body.user_id = userId;
    const collegeId = document.getElementById("collegeId").value.trim();
    if (collegeId) body.college_id = collegeId;

    const data = await postJson(ENDPOINTS.createInterview(), body);
    const id = data.id || data.interview_id || (data.interview && data.interview.id);
    if (!id) {
      log("WARNING", "Create-interview response had no id/interview_id field -- check the raw response above.");
    }
    enableInterviewId(id || null);
  } catch (err) {
    log("ERROR", String(err));
    alert(`POST /interviews failed (expected if that route doesn't exist yet -- paste an existing interview id instead): ${err}`);
  }
});

document.getElementById("btnUseManualId").addEventListener("click", () => {
  const id = document.getElementById("manualInterviewId").value.trim();
  if (!id) {
    alert("Paste an interview id first.");
    return;
  }
  enableInterviewId(id);
  log("INFO", `Using manually-entered interview id ${id}`);
});

document.getElementById("btnNextTurn").addEventListener("click", async () => {
  try {
    const data = await postEmpty(ENDPOINTS.nextTurn(state.interviewId));
    renderTurn(data);
  } catch (err) {
    log("ERROR", String(err));
    alert(err);
  }
});

document.getElementById("btnRecordStart").addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    state.mediaRecorder = new MediaRecorder(stream, { mimeType });
    state.recordedChunks = [];
    state.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) state.recordedChunks.push(e.data);
    };
    state.mediaRecorder.onstop = () => {
      state.recordedBlob = new Blob(state.recordedChunks, { type: mimeType });
      state.recordedDurationSeconds = (Date.now() - state.recordStartedAt) / 1000;
      document.getElementById("answerAudio").src = URL.createObjectURL(state.recordedBlob);
      document.getElementById("btnSubmitTurn").disabled = false;
      document.getElementById("recordStatus").textContent =
        `Recorded ${(state.recordedBlob.size / 1024).toFixed(1)} KB, ` +
        `${state.recordedDurationSeconds.toFixed(1)}s.`;
      stream.getTracks().forEach((t) => t.stop());
    };
    state.mediaRecorder.start();
    state.recordStartedAt = Date.now();
    document.getElementById("btnRecordStart").disabled = true;
    document.getElementById("btnRecordStop").disabled = false;
    document.getElementById("recordStatus").textContent = "Recording... (180s cap per BUILD_SPEC.md Part 4.5)";
    log("INFO", "Recording started");
  } catch (err) {
    log("ERROR", String(err));
    alert(`Could not start recording (needs a real microphone, on localhost or HTTPS) -- use "Submit synthetic silence" instead: ${err}`);
  }
});

document.getElementById("btnRecordStop").addEventListener("click", () => {
  if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
    state.mediaRecorder.stop();
  }
  document.getElementById("btnRecordStart").disabled = false;
  document.getElementById("btnRecordStop").disabled = true;
  log("INFO", "Recording stopped");
});

async function submitAnswer(blob, durationSeconds) {
  const turn = state.currentTurn;
  if (!turn || !turn.turn_id) {
    alert('No current turn with a turn_id -- click "POST .../turns/next" first.');
    return;
  }
  try {
    const form = new FormData();
    form.append("audio", blob, "answer.wav");
    form.append("answer_duration_seconds", String(durationSeconds));
    const data = await apiFetch(ENDPOINTS.submitAnswer(state.interviewId, turn.turn_id), {
      method: "POST",
      body: form,
      bodyForLog: { answer_duration_seconds: durationSeconds, audio: `<blob ${blob.size}B>` },
    });
    document.getElementById("btnSubmitTurn").disabled = true;
    document.getElementById("recordStatus").textContent = "";
    log("INFO", `Transcript (${data.stt_provider}, fallback_used=${data.stt_fallback_used}): ${data.transcript}`);
    renderTurn(data.next_turn);
  } catch (err) {
    log("ERROR", String(err));
    alert(err);
  }
}

document.getElementById("btnSubmitTurn").addEventListener("click", () => {
  submitAnswer(state.recordedBlob, state.recordedDurationSeconds || 1.0);
});

document.getElementById("btnSubmitSilence").addEventListener("click", () => {
  const durationSeconds = 2.0;
  submitAnswer(createSilentWavBlob(durationSeconds), durationSeconds);
});

document.getElementById("btnFinish").addEventListener("click", async () => {
  try {
    const data = await postEmpty(ENDPOINTS.finishInterview(state.interviewId));
    log("INFO", `Interview finished (${JSON.stringify(data)}); the evaluation report runs synchronously, so interview_reports should already have it.`);
    document.getElementById("btnCheckReport").disabled = false;
  } catch (err) {
    log("ERROR", String(err));
    alert(err);
  }
});

document.getElementById("btnCheckReport").addEventListener("click", async () => {
  try {
    const data = await apiFetch(ENDPOINTS.getReport(state.interviewId));
    document.getElementById("reportOut").textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    log("ERROR", String(err));
    document.getElementById("reportOut").textContent =
      "No GET report route yet (" + err + ") -- check the interview_reports table directly for this interview id instead.";
  }
});
</script>
</body>
</html>
"""
