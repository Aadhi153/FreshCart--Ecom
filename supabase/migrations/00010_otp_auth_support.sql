BEGIN;

-- OTP-based auth allows phone-only accounts (no email) and email-only accounts
-- (no phone), so profiles.email can no longer be mandatory. It stays UNIQUE —
-- Postgres unique constraints already allow multiple NULLs, so nothing else
-- needs to change for the email-optional case.
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;

-- Mirror that with a UNIQUE constraint on phone so two accounts can't claim
-- the same number once phone linking goes live.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_phone_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_phone_key UNIQUE (phone);
  END IF;
END $$;

-- A profile must still be reachable by at least one channel.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_or_phone_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_email_or_phone_check
  CHECK (email IS NOT NULL OR phone IS NOT NULL);

-- Signup (email tab) now sends full_name/phone in via auth metadata
-- (signInWithOtp options.data) instead of a password-based signUp call, and
-- phone-only signups won't have auth.users.phone populated from a real
-- verified phone identity yet at profile-creation time — fall back to the
-- metadata phone the signup form collected.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.phone, new.raw_user_meta_data->>'phone')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
