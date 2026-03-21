-- Performance Optimization Indexes
-- Run these SQL commands in Supabase SQL Editor to improve query performance

-- ============================================
-- Sessions Table Indexes
-- ============================================

-- Index for filtering by active status
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);

-- Index for sorting by created_at
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);

-- Index for share_code lookups (frequently used for joining)
CREATE INDEX IF NOT EXISTS idx_sessions_share_code ON sessions(share_code);

-- Composite index for admin queries (status + created_at)
CREATE INDEX IF NOT EXISTS idx_sessions_active_created ON sessions(is_active, created_at DESC);

-- ============================================
-- Slides Table Indexes
-- ============================================

-- Index for session_id lookups
CREATE INDEX IF NOT EXISTS idx_slides_session_id ON slides(session_id);

-- Index for ordering slides within a session
CREATE INDEX IF NOT EXISTS idx_slides_session_order ON slides(session_id, slide_order);

-- Composite index for fetching slides by session with ordering
CREATE INDEX IF NOT EXISTS idx_slides_session_type ON slides(session_id, type);

-- ============================================
-- Participants Table Indexes
-- ============================================

-- Index for session_id lookups
CREATE INDEX IF NOT EXISTS idx_participants_session_id ON participants(session_id);

-- Index for counting participants per session
CREATE INDEX IF NOT EXISTS idx_participants_session_active ON participants(session_id) WHERE left_at IS NULL;

-- ============================================
-- Votes Table Indexes
-- ============================================

-- Index for slide_id lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_votes_slide_id ON votes(slide_id);

-- Index for participant lookups
CREATE INDEX IF NOT EXISTS idx_votes_participant_id ON votes(participant_id);

-- Composite index for vote aggregation queries
CREATE INDEX IF NOT EXISTS idx_votes_slide_option ON votes(slide_id, option_index);

-- ============================================
-- Quiz Answers Table Indexes
-- ============================================

-- Index for slide_id lookups
CREATE INDEX IF NOT EXISTS idx_quiz_answers_slide_id ON quiz_answers(slide_id);

-- Index for participant lookups
CREATE INDEX IF NOT EXISTS idx_quiz_answers_participant_id ON quiz_answers(participant_id);

-- Composite index for quiz aggregation
CREATE INDEX IF NOT EXISTS idx_quiz_answers_slide_answer ON quiz_answers(slide_id, answer_index);

-- ============================================
-- Wordcloud Items Table Indexes
-- ============================================

-- Index for slide_id lookups
CREATE INDEX IF NOT EXISTS idx_wordcloud_items_slide_id ON wordcloud_items(slide_id);

-- Index for ordering by count (most frequent first)
CREATE INDEX IF NOT EXISTS idx_wordcloud_items_count ON wordcloud_items(slide_id, count DESC);

-- ============================================
-- Comments Table Indexes
-- ============================================

-- Index for slide_id lookups
CREATE INDEX IF NOT EXISTS idx_comments_slide_id ON comments(slide_id);

-- Index for ordering comments chronologically
CREATE INDEX IF NOT EXISTS idx_comments_slide_created ON comments(slide_id, created_at DESC);

-- Index for parent_id (for threaded comments if applicable)
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id) WHERE parent_id IS NOT NULL;

-- ============================================
-- Hands Up Table Indexes (if exists)
-- ============================================

-- Index for session lookups
CREATE INDEX IF NOT EXISTS idx_hands_up_session_id ON hands_up(session_id);

-- Index for active hands (not lowered)
CREATE INDEX IF NOT EXISTS idx_hands_up_active ON hands_up(session_id) WHERE lowered_at IS NULL;

-- ============================================
-- Analytics / Stats Optimization
-- ============================================

-- Materialized view for session stats (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS session_stats AS
SELECT
  s.id AS session_id,
  s.title,
  s.created_at,
  s.is_active,
  COUNT(DISTINCT p.id) AS participant_count,
  COUNT(DISTINCT sl.id) AS slide_count,
  COUNT(DISTINCT v.id) AS vote_count,
  COUNT(DISTINCT qa.id) AS quiz_answer_count,
  COUNT(DISTINCT wc.id) AS wordcloud_count
FROM sessions s
LEFT JOIN participants p ON p.session_id = s.id
LEFT JOIN slides sl ON sl.session_id = s.id
LEFT JOIN votes v ON v.slide_id = sl.id
LEFT JOIN quiz_answers qa ON qa.slide_id = sl.id
LEFT JOIN wordcloud_items wc ON wc.slide_id = sl.id
GROUP BY s.id;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_stats_id ON session_stats(session_id);

-- Refresh the materialized view (run this via cron or on data changes)
-- REFRESH MATERIALIZED VIEW session_stats;

-- ============================================
-- Query Optimization Functions
-- ============================================

-- Function to get session stats efficiently
CREATE OR REPLACE FUNCTION get_session_stats(p_session_id UUID)
RETURNS TABLE(
  participant_count BIGINT,
  slide_count BIGINT,
  vote_count BIGINT,
  quiz_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM participants WHERE session_id = p_session_id),
    (SELECT COUNT(*) FROM slides WHERE session_id = p_session_id),
    (SELECT COUNT(*) FROM votes v JOIN slides sl ON v.slide_id = sl.id WHERE sl.session_id = p_session_id),
    (SELECT COUNT(*) FROM quiz_answers qa JOIN slides sl ON qa.slide_id = sl.id WHERE sl.session_id = p_session_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS Policy Optimization
-- ============================================

-- Ensure RLS policies use indexed columns
-- Example: instead of checking complex conditions, use indexed columns

-- If you have RLS policies that check session membership, ensure they use indexed lookups:
-- CREATE POLICY "Users can view their session data" ON slides
--   FOR SELECT USING (
--     session_id IN (SELECT id FROM sessions WHERE created_by = auth.uid())
--   );

-- ============================================
-- Maintenance Commands
-- ============================================

-- Analyze tables to update statistics (run periodically)
ANALYZE sessions;
ANALYZE slides;
ANALYZE participants;
ANALYZE votes;
ANALYZE quiz_answers;
ANALYZE wordcloud_items;
ANALYZE comments;

-- Vacuum tables to reclaim space (run during low-traffic periods)
-- VACUUM ANALYZE sessions;
-- VACUUM ANALYZE slides;
-- VACUUM ANALYZE participants;
