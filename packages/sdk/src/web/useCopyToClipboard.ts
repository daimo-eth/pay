import { useCallback, useRef, useState } from "react";

/** Web-only clipboard hook with visual feedback. */
export function useCopyToClipboard(resetMs = 2000) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), resetMs);
      } catch {
        console.error("failed to copy to clipboard");
      }
    },
    [resetMs],
  );

  return { copy, copied };
}
