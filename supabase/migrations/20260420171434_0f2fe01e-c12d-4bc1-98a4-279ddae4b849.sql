ALTER TABLE public.health_packages ADD COLUMN IF NOT EXISTS stations jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.package_bookings ADD COLUMN IF NOT EXISTS station_progress jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.package_bookings ADD COLUMN IF NOT EXISTS current_station text;