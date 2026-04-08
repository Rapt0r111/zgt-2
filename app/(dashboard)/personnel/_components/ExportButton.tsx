"use client";

import { useState, useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { exportPersonnelToExcel } from "@/lib/actions/export";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

export function ExportPersonnelButton() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleExport = () => {
    startTransition(async () => {
      try {
        const result = await exportPersonnelToExcel();

        // Decode base64 and trigger download
        const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
        const blob  = new Blob([bytes], { type: result.mimeType });
        const url   = URL.createObjectURL(blob);

        const a    = document.createElement("a");
        a.href     = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({ variant: "success", title: "Экспорт готов", description: result.filename });
      } catch {
        toast({ variant: "error", title: "Ошибка экспорта", description: "Не удалось создать файл" });
      }
    });
  };

  return (
    <button
      onClick={handleExport}
      disabled={isPending}
      className={cn(
        "h-9 px-3 rounded-lg border border-input text-sm",
        "flex items-center gap-2 transition-colors",
        "hover:bg-muted text-muted-foreground hover:text-foreground",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "focus:outline-none focus:ring-2 focus:ring-ring"
      )}
      title="Экспорт в Excel"
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      <span className="hidden sm:inline">Excel</span>
    </button>
  );
}