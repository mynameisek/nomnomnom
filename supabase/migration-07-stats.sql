-- Phase 7: Add parse_time_ms and hit_count for scan statistics (ADMN-03)

-- parse_time_ms: milliseconds taken by LLM parse (populated on fresh parse only)
ALTER TABLE menus ADD COLUMN IF NOT EXISTS parse_time_ms integer;

-- hit_count: incremented each time a cache hit occurs (starts at 0)
ALTER TABLE menus ADD COLUMN IF NOT EXISTS hit_count integer NOT NULL DEFAULT 0;

-- Postgres function for admin dashboard stats (called via supabaseAdmin.rpc)
CREATE OR REPLACE FUNCTION get_scan_stats()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'total_scans', count(*),
      'active_cache_count', count(*) FILTER (WHERE expires_at > now()),
      'avg_parse_time_ms', round(avg(parse_time_ms)::numeric, 0),
      'total_cache_hits', coalesce(sum(hit_count), 0)
    )
    FROM menus
  );
END;
$$;
