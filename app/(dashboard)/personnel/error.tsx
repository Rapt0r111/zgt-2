"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function PersonnelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PersonnelPage]", error);
  }, [error]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-20 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Ошибка загрузки</h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        Не удалось загрузить данные о личном составе.
        {error.digest && (
          <span className="block mt-1 font-mono text-xs opacity-60">
            {error.digest}
          </span>
        )}
      </p>
      <button
        onClick={reset}
        className="mt-6 h-9 px-4 rounded-lg border border-input text-sm
          flex items-center gap-2 hover:bg-muted transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Попробовать снова
      </button>
    </div>
  );
}