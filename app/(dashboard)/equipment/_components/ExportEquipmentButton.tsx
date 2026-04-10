"use client";

import { useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { exportEquipmentToExcel } from "@/lib/actions/export";
import type { EquipmentExportFilters } from "@/lib/actions/export";
import { useToast } from "@/components/ui/toaster";
import type { EquipmentStatus } from "@/types/equipment";

export function ExportEquipmentButton() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const handleExport = () => {
    const filters: EquipmentExportFilters = {
      q:        searchParams.get("q")        ?? "",
      status:   (searchParams.get("status")  ?? "") as EquipmentStatus | "",
      category: searchParams.get("category") ?? "",
      location: searchParams.get("location") ?? "",
    };

    startTransition(async () => {
      try {
        const result = await exportEquipmentToExcel(filters);
        const bytes  = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
        const blob   = new Blob([bytes], { type: result.mimeType });
        const url    = URL.createObjectURL(blob);
        const a      = document.createElement("a");
        a.href       = url;
        a.download   = result.filename;
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
      title="Экспорт текущей выборки в Excel"
      className="h-9 px-3 rounded-xl text-xs flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: "hsl(220 38% 10%)",
        border: "1px solid hsl(220 30% 16%)",
        color: "hsl(215 16% 55%)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = "hsl(213 100% 72%)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(217 91% 60% / 0.35)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = "hsl(215 16% 55%)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(220 30% 16%)";
      }}
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