'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { MenuItem } from '@/lib/types/menu';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_DURATION_MS = 60_000; // 60 seconds safety timeout

export function useEnrichmentPolling(menuId: string, initialItems: MenuItem[]) {
  const [enrichedItems, setEnrichedItems] = useState(initialItems);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const startRef = useRef(Date.now());

  // Returns true if any food item still needs work:
  // - enrichment_status === 'pending'  (enrichment not done yet)
  // - enrichment_status === 'enriched' AND enrichment_depth === 'full' AND no image_url yet
  const hasPendingWork = useCallback((itemList: MenuItem[]) =>
    itemList.some(i =>
      !i.is_beverage && (
        i.enrichment_status === 'pending' ||
        (i.enrichment_status === 'enriched' && i.enrichment_depth === 'full' && !i.image_url)
      )
    ),
  []);

  useEffect(() => {
    mountedRef.current = true;
    startRef.current = Date.now();

    if (!hasPendingWork(initialItems)) return;

    const poll = async () => {
      // Safety timeout: stop after 60 seconds regardless
      if (Date.now() - startRef.current > MAX_POLL_DURATION_MS) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      try {
        const res = await fetch(`/api/enrichment/status?menuId=${menuId}`);
        if (!res.ok || !mountedRef.current) return;
        const data = await res.json();
        if (!data.items || !mountedRef.current) return;

        setEnrichedItems(prev =>
          prev.map(item => {
            const fresh = data.items.find((d: { id: string }) => d.id === item.id);
            return fresh ? { ...item, ...fresh } : item;
          })
        );

        // Stop polling when no items have pending work (enrichment + images)
        const stillPending = data.items.some(
          (d: { enrichment_status: string; enrichment_depth: string | null; image_url: string | null }) =>
            d.enrichment_status === 'pending' ||
            (d.enrichment_status === 'enriched' && d.enrichment_depth === 'full' && !d.image_url)
        );
        if (!stillPending && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } catch (err) {
        console.error('[useEnrichmentPolling] Poll error:', err);
      }
    };

    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [menuId, hasPendingWork, initialItems]);

  return enrichedItems;
}
