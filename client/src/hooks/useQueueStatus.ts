export function useQueueStatus(entryId: string) {
  const [entry, setEntry] = useState<QueueEntry | null>(null);
  useEffect(() => {
    const poll = setInterval(async () => setEntry(await getQueueStatus(entryId)), 5000);
    return () => clearInterval(poll);
  }, [entryId]);
  return entry;
}