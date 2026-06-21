CREATE TABLE IF NOT EXISTS public.hotel_app_state (
  state_key TEXT PRIMARY KEY CHECK (state_key ~ '^[a-z0-9_-]{1,64}$'),
  state_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hotel_app_state ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_hotel_app_state_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_hotel_app_state_updated_at ON public.hotel_app_state;
CREATE TRIGGER update_hotel_app_state_updated_at
BEFORE UPDATE ON public.hotel_app_state
FOR EACH ROW EXECUTE FUNCTION public.update_hotel_app_state_updated_at();

DROP POLICY IF EXISTS "No direct read access to hotel app state" ON public.hotel_app_state;
DROP POLICY IF EXISTS "No direct create access to hotel app state" ON public.hotel_app_state;
DROP POLICY IF EXISTS "No direct edit access to hotel app state" ON public.hotel_app_state;
DROP POLICY IF EXISTS "No direct delete access to hotel app state" ON public.hotel_app_state;

CREATE POLICY "No direct read access to hotel app state" ON public.hotel_app_state FOR SELECT USING (false);
CREATE POLICY "No direct create access to hotel app state" ON public.hotel_app_state FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct edit access to hotel app state" ON public.hotel_app_state FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "No direct delete access to hotel app state" ON public.hotel_app_state FOR DELETE USING (false);

ALTER PUBLICATION supabase_realtime ADD TABLE public.hotel_app_state;
ALTER TABLE public.hotel_app_state REPLICA IDENTITY FULL;