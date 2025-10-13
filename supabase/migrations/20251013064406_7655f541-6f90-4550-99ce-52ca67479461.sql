-- Create certification tracking table
CREATE TABLE public.certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certification_name TEXT NOT NULL,
  issue_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expiring_soon', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

-- Policies for certifications
CREATE POLICY "Managers can view all certifications"
  ON public.certifications
  FOR SELECT
  USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can insert certifications"
  ON public.certifications
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can update certifications"
  ON public.certifications
  FOR UPDATE
  USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Users can view own certifications"
  ON public.certifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_certifications_updated_at
  BEFORE UPDATE ON public.certifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();