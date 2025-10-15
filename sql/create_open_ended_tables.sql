-- Create open_ended_questions table
CREATE TABLE IF NOT EXISTS public.open_ended_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL,
  question text NOT NULL,
  good_answer_criteria text NOT NULL,
  medium_answer_criteria text NOT NULL,
  bad_answer_criteria text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT open_ended_questions_pkey PRIMARY KEY (id),
  CONSTRAINT open_ended_questions_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.training_modules(id) ON DELETE CASCADE
);

-- Create open_ended_responses table
CREATE TABLE IF NOT EXISTS public.open_ended_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id uuid NOT NULL,
  module_id uuid NOT NULL,
  answer text NOT NULL,
  ai_grade text CHECK (ai_grade = ANY (ARRAY['good'::text, 'medium'::text, 'bad'::text])),
  ai_feedback text,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  graded_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT open_ended_responses_pkey PRIMARY KEY (id),
  CONSTRAINT open_ended_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT open_ended_responses_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.open_ended_questions(id) ON DELETE CASCADE,
  CONSTRAINT open_ended_responses_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.training_modules(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.open_ended_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_ended_responses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone authenticated can view questions" ON public.open_ended_questions;
DROP POLICY IF EXISTS "Managers can insert questions" ON public.open_ended_questions;
DROP POLICY IF EXISTS "Managers can update questions" ON public.open_ended_questions;
DROP POLICY IF EXISTS "Managers can delete questions" ON public.open_ended_questions;
DROP POLICY IF EXISTS "Users can insert own responses" ON public.open_ended_responses;
DROP POLICY IF EXISTS "Users can view own responses" ON public.open_ended_responses;
DROP POLICY IF EXISTS "Managers can view all responses" ON public.open_ended_responses;
DROP POLICY IF EXISTS "Users can update own responses" ON public.open_ended_responses;

-- RLS Policies for open_ended_questions
CREATE POLICY "Anyone authenticated can view questions"
  ON public.open_ended_questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can insert questions"
  ON public.open_ended_questions FOR INSERT
  TO authenticated
  USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can update questions"
  ON public.open_ended_questions FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can delete questions"
  ON public.open_ended_questions FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'manager'::app_role));

-- RLS Policies for open_ended_responses
CREATE POLICY "Users can insert own responses"
  ON public.open_ended_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own responses"
  ON public.open_ended_responses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all responses"
  ON public.open_ended_responses FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Users can update own responses"
  ON public.open_ended_responses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_open_ended_questions_module_id ON public.open_ended_questions(module_id);
CREATE INDEX IF NOT EXISTS idx_open_ended_responses_user_id ON public.open_ended_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_open_ended_responses_question_id ON public.open_ended_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_open_ended_responses_module_id ON public.open_ended_responses(module_id);
