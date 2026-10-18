// STUB — the prep assistant's "answer" while Phase 1 (Gemini + the curated
// knowledge-base retrieval) is blocked on provider API keys.
//
// TODO(phase-1): replace with a real RAG call once GEMINI_API_KEY exists:
// retrieve from kb_chunks by embedding similarity, pass the matched chunks
// plus the student's weak_areas to the conversation model, and return the
// real answer with real citations (document titles/links), or a real "I
// don't have reliable information on that" decline when retrieval finds
// nothing above the similarity threshold — see docs/BUILD_SPEC.md Part 4.6.
//
// This never fabricates a citation and never claims to be a real answer:
// citations is always [], declined is always false (a mock reply isn't a
// real decline either), and the text says plainly that it's a preview —
// so the badge the chat UI shows for it (model_id === STUB_MODEL_ID) and
// the wording agree with each other.

export const STUB_MODEL_ID = "stub-preview-v1";

export interface ChatStubReply {
  content: string;
  modelId: string;
  citations: [];
  declined: false;
}

export async function chatRespondStub(userMessage: string): Promise<ChatStubReply> {
  const trimmed = userMessage.trim();
  const echo = trimmed.length > 160 ? `${trimmed.slice(0, 160)}…` : trimmed;

  const content =
    "Preview mode — this isn't a real answer. The prep assistant's retrieval over the " +
    "curated knowledge base and its LLM response both need provider API keys that aren't " +
    "configured yet (Phase 1 of the build is blocked on that). Once Phase 1 lands, a real " +
    "reply here will cite the specific documents it drew on, or say plainly when it has no " +
    `reliable information on a topic. For now, here's what I heard: "${echo}"`;

  return {
    content,
    modelId: STUB_MODEL_ID,
    citations: [],
    declined: false,
  };
}

/** Whether a stored chat_messages row was produced by this stub, for the UI's preview badge. */
export function isStubReply(modelId: string | null): boolean {
  return modelId === STUB_MODEL_ID;
}
