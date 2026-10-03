CREATE OR REPLACE FUNCTION public.community_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'donors', (SELECT count(*) FROM public.profiles),
    'donations', (SELECT count(*) FROM public.donations),
    'volume_ml', (SELECT coalesce(sum(volume_ml), 0) FROM public.donations),
    'donations_month', (SELECT count(*) FROM public.donations WHERE donated_at >= date_trunc('month', now())),
    'hospitals', (SELECT count(DISTINCT coalesce(hospital_name, hospital_id::text)) FROM public.hospital_requests),
    'requests_total', (SELECT count(*) FROM public.hospital_requests),
    'requests_done', (SELECT count(*) FROM public.hospital_requests WHERE status = 'atendido'),
    'units_delivered', (SELECT coalesce(sum(units), 0) FROM public.hospital_requests WHERE status = 'atendido'),
    'centers', (SELECT count(*) FROM public.centers),
    'donors_by_type', (SELECT coalesce(json_object_agg(bt, n), '{}'::json) FROM (SELECT blood_type AS bt, count(*) AS n FROM public.profiles WHERE blood_type IS NOT NULL GROUP BY blood_type) t),
    'stock', (SELECT coalesce(json_agg(json_build_object('blood_type', blood_type, 'units', units, 'min_units', min_units) ORDER BY blood_type), '[]'::json) FROM public.inventory)
  );
$$;

REVOKE ALL ON FUNCTION public.community_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.community_stats() TO authenticated;