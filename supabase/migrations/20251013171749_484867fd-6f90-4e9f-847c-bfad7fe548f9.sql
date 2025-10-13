-- Create user_metrics table to store AccuracyRate and ProgressPercent
CREATE TABLE public.user_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accuracy_rate numeric NOT NULL DEFAULT 0,
  progress_percent integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_metrics ENABLE ROW LEVEL SECURITY;

-- Policies for user_metrics
CREATE POLICY "Users can view own metrics"
ON public.user_metrics
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all metrics"
ON public.user_metrics
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Users can update own metrics"
ON public.user_metrics
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metrics"
ON public.user_metrics
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_metrics_updated_at
BEFORE UPDATE ON public.user_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();