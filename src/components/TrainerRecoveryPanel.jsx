import { useEffect, useState } from "react";
import { pokemonAPI } from "@/api/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, KeyRound } from "lucide-react";

async function defaultCopyRecoveryCode(recoveryCode) {
  if (!globalThis.navigator?.clipboard?.writeText) return;
  await globalThis.navigator.clipboard.writeText(recoveryCode);
}

export default function TrainerRecoveryPanel({
  apiClient = pokemonAPI,
  copyRecoveryCode = defaultCopyRecoveryCode,
}) {
  const [recoveryCode, setRecoveryCode] = useState('');
  const [status, setStatus] = useState('loading');
  const [copyStatus, setCopyStatus] = useState('idle');

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const code = await apiClient.getTrainerRecoveryCode();
        if (!isMounted) return;
        setRecoveryCode(code);
        setStatus('ready');
      } catch {
        if (!isMounted) return;
        setStatus('error');
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [apiClient]);

  const handleCopy = async () => {
    if (!recoveryCode) return;

    try {
      await copyRecoveryCode(recoveryCode);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      setCopyStatus('error');
    }
  };

  return (
    <div className="gold-panel p-6 text-left">
      <div className="gold-panel-content">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#8a5c18]">
              Account Safety
            </p>
            <h2 className="mt-1 text-2xl font-bold flex items-center gap-2">
              <KeyRound className="w-6 h-6" />
              Trainer Recovery
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#5c4320]/80">
              Save this code before switching browsers or clearing storage.
            </p>
          </div>
          {copyStatus === 'copied' && (
            <span className="inline-flex items-center gap-1 rounded border border-[#6fb56f]/60 bg-[#e8ffe8] px-3 py-1 text-sm font-black text-[#2f6f3a]">
              <CheckCircle2 className="w-4 h-4" />
              Copied
            </span>
          )}
        </div>

        {status === 'loading' && (
          <div className="mt-4 rounded border border-[#c79a36]/60 bg-[#fff3c4] px-3 py-2 text-sm font-black text-[#4f3514]">
            Loading recovery code...
          </div>
        )}

        {status === 'error' && (
          <div className="mt-4 rounded border border-[#d45b4f]/60 bg-[#ffe3dc] px-3 py-2 text-sm font-black text-[#7a241c]">
            Recovery code unavailable
          </div>
        )}

        {status === 'ready' && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 overflow-hidden text-ellipsis rounded border border-[#c79a36]/60 bg-[#fff3c4] px-3 py-2 text-sm font-black text-[#4f3514]">
              {recoveryCode}
            </code>
            <Button onClick={handleCopy} className="h-11 px-5 text-base font-bold">
              <Copy className="w-4 h-4 mr-2" />
              Copy Code
            </Button>
          </div>
        )}

        {copyStatus === 'error' && (
          <p className="mt-3 text-sm font-bold text-[#7a241c]">
            Copy failed. Select the code manually.
          </p>
        )}
      </div>
    </div>
  );
}
