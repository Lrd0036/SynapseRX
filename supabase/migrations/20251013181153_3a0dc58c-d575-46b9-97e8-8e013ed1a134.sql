-- Drop the existing policy that only allows users to view their own roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Allow users to view their own role
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow managers to view all user roles
CREATE POLICY "Managers can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'manager'::app_role));