/**
 * k6 Load Testing Script for Vyoman Interviewer.
 *
 * Implements docs/BUILD_SPEC.md Part 7 Phase 7 (hardening & load testing):
 * Simulates concurrent student interviews against the interview engine / platform.
 *
 * Checks:
 * - Engine health (/health)
 * - Interview lifecycle: create -> next turn -> submit answer -> finish -> report
 * - Enforces target latency SLAs: p50 < 2500ms, p95 < 4000ms per turn.
 * - Enforces error rate < 1%.
 *
 * Usage:
 *   k6 run eval/load_test_k6.js
 *   k6 run --vus 50 --duration 1m eval/load_test_k6.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.ENGINE_BASE_URL || "http://localhost:8000";

// Custom metrics
const turnLatencyTrend = new Trend("interview_turn_latency_ms");
const reportLatencyTrend = new Trend("interview_report_latency_ms");
const errorRate = new Rate("error_rate");
const completedInterviews = new Counter("completed_interviews");

export const options = {
  stages: [
    { duration: "30s", target: 20 },  // Ramp up to 20 concurrent users
    { duration: "1m", target: 50 },   // Scale to 50 concurrent simulated students
    { duration: "2m", target: 100 },  // Peak load: 100 concurrent students
    { duration: "30s", target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],          // HTTP errors should be less than 1%
    error_rate: ["rate<0.01"],               // Custom error rate < 1%
    interview_turn_latency_ms: ["p(50)<2500", "p(95)<4000"], // SLA targets from BUILD_SPEC Part 4.5
  },
};

export default function () {
  const userId = `load-test-student-${__VU}-${__ITER}`;

  // 1. Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  const healthOk = check(healthRes, {
    "health check is 200": (r) => r.status === 200,
  });
  errorRate.add(!healthOk);

  // 2. Create interview
  const createPayload = JSON.stringify({
    user_id: "00000000-0000-0000-0000-000000000001",
    interview_type: "technical",
    difficulty: "medium",
    target_role: "Software Development Engineer",
    company_type: "product",
  });

  const createRes = http.post(`${BASE_URL}/interviews`, createPayload, {
    headers: { "Content-Type": "application/json" },
  });

  const createOk = check(createRes, {
    "interview created successfully": (r) => r.status === 200 && JSON.parse(r.body).id !== undefined,
  });
  errorRate.add(!createOk);

  if (!createOk) {
    sleep(1);
    return;
  }

  const interviewId = JSON.parse(createRes.body).id;

  // 3. First turn (next question)
  const turnStart = Date.now();
  const nextTurnRes = http.post(`${BASE_URL}/interviews/${interviewId}/turns/next`);
  const turnLatency = Date.now() - turnStart;
  turnLatencyTrend.add(turnLatency);

  const turnOk = check(nextTurnRes, {
    "next turn received question": (r) => r.status === 200,
  });
  errorRate.add(!turnOk);

  if (turnOk) {
    const turnData = JSON.parse(nextTurnRes.body);
    const turnId = turnData.turn_id;

    // Simulate candidate thinking & answering (1.5 seconds)
    sleep(1.5);

    if (turnId) {
      // 4. Submit simulated answer
      const answerStart = Date.now();
      const answerPayload = {
        answer_duration_seconds: "12.5",
        audio_key: "answers/simulated-audio.webm",
      };

      const answerRes = http.post(
        `${BASE_URL}/interviews/${interviewId}/turns/${turnId}/answer`,
        answerPayload
      );

      const answerLatency = Date.now() - answerStart;
      turnLatencyTrend.add(answerLatency);

      check(answerRes, {
        "answer submitted or accepted": (r) => r.status === 200 || r.status === 422,
      });
    }
  }

  // 5. Finish interview
  const finishPayload = JSON.stringify({
    eye_contact_pct: 85.0,
    posture_stability_pct: 90.0,
  });

  const finishRes = http.post(`${BASE_URL}/interviews/${interviewId}/finish`, finishPayload, {
    headers: { "Content-Type": "application/json" },
  });

  check(finishRes, {
    "finish interview 200": (r) => r.status === 200,
  });

  // 6. Read back report
  const reportStart = Date.now();
  const reportRes = http.get(`${BASE_URL}/interviews/${interviewId}/report`);
  reportLatencyTrend.add(Date.now() - reportStart);

  check(reportRes, {
    "report retrieved or pending": (r) => r.status === 200 || r.status === 404,
  });

  completedInterviews.add(1);
  sleep(1);
}
