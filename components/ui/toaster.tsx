"use client";

/**
 * components/ui/toaster.tsx
 * Lightweight toast system using @radix-ui/react-toast
 */

import * as RadixToast from "@radix-ui/react-toast";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id:       string;
  title:    string;
  description?: string;
  variant:  ToastVariant;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, "id">) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const ICONS: Record<ToastVariant, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error:   AlertCircle,
  info:    Info,
};

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "border-emerald-500/40 bg-emerald-950/80 text-emerald-100",
  error:   "border-red-500/40 bg-red-950/80 text-red-100",
  info:    "border-blue-500/40 bg-blue-950/80 text-blue-100",
};

const ICON_STYLES: Record<ToastVariant, string> = {
  success: "text-emerald-400",
  error:   "text-red-400",
  info:    "text-blue-400",
};

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((opts: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-4), { ...opts, id }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <RadixToast.Provider swipeDirection="right" duration={4000}>
        {children}

        {toasts.map((t) => {
          const Icon = ICONS[t.variant];
          return (
            <RadixToast.Root
              key={t.id}
              open
              onOpenChange={(open) => !open && dismiss(t.id)}
              className={cn(
                "flex items-start gap-3 w-80 p-4 rounded-xl border shadow-2xl backdrop-blur",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
                "data-[state=open]:slide-in-from-right-full data-[state=open]:fade-in-0",
                VARIANT_STYLES[t.variant]
              )}
            >
              <Icon className={cn("w-5 h-5 mt-0.5 shrink-0", ICON_STYLES[t.variant])} />
              <div className="flex-1 min-w-0">
                <RadixToast.Title className="text-sm font-semibold">
                  {t.title}
                </RadixToast.Title>
                {t.description && (
                  <RadixToast.Description className="text-xs opacity-80 mt-0.5">
                    {t.description}
                  </RadixToast.Description>
                )}
              </div>
              <RadixToast.Close
                className="shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </RadixToast.Close>
            </RadixToast.Root>
          );
        })}

        <RadixToast.Viewport className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 outline-none" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}