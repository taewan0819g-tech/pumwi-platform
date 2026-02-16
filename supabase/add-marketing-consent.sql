-- Legal compliance: marketing consent and consent date on profiles.
-- Run in Supabase SQL Editor.
--
-- Email verification (recommended): In Supabase Dashboard go to
-- Authentication -> Providers -> Email and enable "Confirm email".

-- Add columns to profiles
alter table public.profiles
  add column if not exists marketing_consent boolean not null default false;

alter table public.profiles
  add column if not exists marketing_consent_date timestamptz;

comment on column public.profiles.marketing_consent is 'User opted in to receive marketing/event information at signup.';
comment on column public.profiles.marketing_consent_date is 'When marketing_consent was set to true.';

-- Update new-user trigger so profile gets consent from signUp metadata
create or replace function public.handle_new_user()
returns trigger as $$
declare
  consent boolean;
begin
  consent := coalesce((new.raw_user_meta_data->>'marketing_consent')::boolean, false);
  insert into public.profiles (id, full_name, marketing_consent, marketing_consent_date)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    consent,
    case when consent then now() else null end
  );
  return new;
end;
$$ language plpgsql security definer;
