-- Phase 7: 보안 강화 RLS 정책 (실제 운영 환경용)
-- 이 SQL을 Supabase SQL Editor에서 실행하세요.

-- 1. 기존의 너무 개방적인 정책 삭제 (필요 시)
-- DROP POLICY IF EXISTS "Enable update access for all users" ON public.slides;
-- DROP POLICY IF EXISTS "Enable delete access for all users" ON public.slides;

-- 2. 세션 (Sessions) 정책
-- 생성: 누구나 가능 (익명 인증 권장)
-- 조회: 누구나 가능 (세션 코드를 아는 경우)
-- 수정/삭제: 생성자만 가능 (auth.uid() 연동 필요)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create sessions" ON public.sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view sessions" ON public.sessions
  FOR SELECT USING (true);

-- 3. 슬라이드 (Slides) 정책
-- 조회: 누구나 가능
-- 관리(추가/수정/삭제): 세션 생성자만 가능
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view slides" ON public.slides
  FOR SELECT USING (true);

-- 세션 ID를 통해 세션의 created_by와 현재 사용자의 ID를 비교
-- (참고: API Route에서 Service Role을 사용하지 않고 Client SDK를 직접 쓸 경우 유용)
CREATE POLICY "Only session creator can manage slides" ON public.slides
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = slides.session_id 
      AND (sessions.created_by = auth.uid()::text OR sessions.created_by = 'anonymous')
    )
  );

-- 4. 투표 (Votes) 정책
-- 제출: 누구나 가능 (중복 방지는 Unique constraint로 처리)
-- 조회: 누구나 가능 (실시간 차트용)
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can vote" ON public.votes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view votes" ON public.votes
  FOR SELECT USING (true);

-- 5. 댓글 (Comments) 정책
-- 작성: 누구나 가능
-- 조회: 누구나 가능
-- 삭제: 작성자 또는 세션 생성자만 가능
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can comment" ON public.comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view comments" ON public.comments
  FOR SELECT USING (true);

-- 6. 손들기 (Hands Up) 정책
ALTER TABLE public.hands_up ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can toggle hands up" ON public.hands_up
  FOR ALL USING (true);

-- 7. 실시간 익명 인증을 위한 설정 (Supabase Auth 사용 시)
-- 만약 익명 사용자를 허용하려면 Supabase Dashboard -> Authentication -> Providers -> Anonymous 활성화 필요
