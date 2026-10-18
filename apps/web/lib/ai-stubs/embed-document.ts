import type { SupabaseClient } from "@supabase/supabase-js";

export interface EmbedDocumentResult {
  ok: true;
  documentId: string;
  chunksCreated: number;
  note: string;
}

/**
 * STUB — the knowledge-base editor's "approve → chunk & embed" action.
 *
 * TODO(phase-1): replace with a real call to the engine once GEMINI_API_KEY
 * (the embedding model) exists. The real version should chunk
 * `kb_documents.raw_text`, call Gemini's embedding model per chunk, and
 * insert the results into `kb_chunks` (vector(768)) — none of that happens
 * here.
 *
 * All this does today is flip `kb_documents.status` to 'reviewed' (the
 * platform_admin's human review decision is real and really persisted) and
 * return a result shaped like the eventual real response, so the caller
 * and UI don't need to change once the real pipeline lands. It
 * deliberately creates zero `kb_chunks` rows: that table has no
 * anon/authenticated access at all (engine-internal only — see
 * supabase/migrations/20261015120007_row_level_security.sql) and real
 * chunking needs the embedding model this environment has no credentials
 * for yet.
 */
export async function embedDocumentStub(
  supabase: SupabaseClient,
  documentId: string,
  reviewerId: string,
): Promise<EmbedDocumentResult> {
  const { error } = await supabase
    .from("kb_documents")
    .update({
      status: "reviewed",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (error) {
    throw new Error(error.message);
  }

  return {
    ok: true,
    documentId,
    chunksCreated: 0,
    note:
      "Preview — chunking & embedding is pending Phase 1 (needs GEMINI_API_KEY). This " +
      "document is now marked reviewed, but it has no kb_chunks yet, so the prep assistant " +
      "can't retrieve it until the real pipeline runs.",
  };
}
