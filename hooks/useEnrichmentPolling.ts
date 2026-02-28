'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { MenuItem } from '@/lib/types/menu';

const POLL_INTERVAL_MS = 3000;

export function useEnrichmentPolling(menuId: string, initialItems: MenuItem[]) {
  const [enrichedItems, setEnrichedItems] = useState(initialItems);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const hasPendingFoodItems = useCallback((itemList: MenuItem[]) =>
    itemList.some(i => !i.is_beverage && i.enrichment_status === 'pending'),
  []);

  useEffect(() => {
    mountedRef.current = true;
    if (!hasPendingFoodItems(initialItems)) return;

    const poll = async () => {
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

        // Stop polling when no food items are still pending
        const stillPending = data.items.some(
          (d: { enrichment_status: string }) => d.enrichment_status === 'pending'
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
  }, [menuId, hasPendingFoodItems, initialItems]);

  return enrichedItems;
}
