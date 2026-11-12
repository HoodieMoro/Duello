export default function Loading({ text = 'Collegamento…' }: { text?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-sm text-ink-400">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
      {text}
    </div>
  );
}
