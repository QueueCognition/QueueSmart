import { useEffect, useState } from "react";
import type { QueueEntry } from "../types/queue";
import { getQueueStatus } from "../services/queueService";

export function useQueueStatus(entryId: string) {
  const [entry, setEntry] = useState<QueueEntry | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchStatus() {
      const data = await getQueueStatus(entryId);
      if (active) setEntry(data);
    }

    fetchStatus(); // fetch immediately on mount
    const interval = setInterval(fetchStatus, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [entryId]);

  return entry;
}
