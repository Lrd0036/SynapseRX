-- Ensure correct roles are assigned for pharmacist and technician test users
DO $$
DECLARE
  pharmacist_id uuid;
  technician_id uuid;
BEGIN
  -- Get the UUID for the pharmacist user
  SELECT id INTO pharmacist_id FROM auth.users WHERE email = 'pharmacist@example.com';
  -- Get the UUID for the technician user
  SELECT id INTO technician_id FROM auth.users WHERE email = 'technician@example.com';

  -- If the pharmacist user exists, ensure they have the manager role
  IF pharmacist_id IS NOT NULL THEN
    -- Delete existing roles and insert manager role
    DELETE FROM public.user_roles WHERE user_id = pharmacist_id;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (pharmacist_id, 'manager');
  END IF;

  -- If the technician user exists, ensure they have the technician role
  IF technician_id IS NOT NULL THEN
    -- Delete existing roles and insert technician role
    DELETE FROM public.user_roles WHERE user_id = technician_id;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (technician_id, 'technician');
  END IF;
END $$;