"use client";

/**
 * components/ui/toaster.tsx — Aurora glass toasts
 */

import * as RadixToast from "@radix-ui/react-toast";
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { X, CheckCircle2, AlertCircle, Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id:          string;
  title:       string;
  description?: string;
  variant:     ToastVariant;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const ICONS: Record<ToastVariant, LucideIcon> = {
  success: CheckCircle2,
  error:   AlertCircle,
  info:    Info,
};

const VARIANT_STYLES: Record<ToastVariant, React.CSSProperties> = {
  success: {
    background: "hsl(220 40% 10% / 0.95)",
    border: "1px solid hsl(160 84% 55% / 0.3)",
    backdropFilter: "blur(20px)",
    color: "hsl(220 50% 92%)",
  },
  error: {
    background: "hsl(220 40% 10% / 0.95)",
    border: "1px solid hsl(0 72% 60% / 0.3)",
    backdropFilter: "blur(20px)",
    color: "hsl(220 50% 92%)",
  },
  info: {
    background: "hsl(220 40% 10% / 0.95)",
    border: "1px solid hsl(217 91% 60% / 0.3)",
    backdropFilter: "blur(20px)",
    color: "hsl(220 50% 92%)",
  },
};

const ICON_COLORS: Record<ToastVariant, string> = {
  success: "hsl(160 84% 60%)",
  error:   "hsl(0 72% 72%)",
  info:    "hsl(213 100% 72%)",
};

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
                "flex items-start gap-3 w-80 p-4 rounded-2xl shadow-2xl",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
                "data-[state=open]:slide-in-from-right-full data-[state=open]:fade-in-0"
              )}
              style={{
                ...VARIANT_STYLES[t.variant],
                boxShadow: "0 16px 40px hsl(220 47% 2% / 0.5)",
              }}
            >
              <Icon
                className="w-5 h-5 mt-0.5 shrink-0"
                style={{ color: ICON_COLORS[t.variant] }}
              />
              <div className="flex-1 min-w-0">
                <RadixToast.Title className="text-sm font-600" style={{ fontWeight: 600 }}>
                  {t.title}
                </RadixToast.Title>
                {t.description && (
                  <RadixToast.Description
                    className="text-xs mt-0.5"
                    style={{ color: "hsl(215 16% 55%)" }}
                  >
                    {t.description}
                  </RadixToast.Description>
                )}
              </div>
              <RadixToast.Close
                className="shrink-0 transition-opacity opacity-40 hover:opacity-80"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </RadixToast.Close>
            </RadixToast.Root>
          );
        })}

        <RadixToast.Viewport
          className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 outline-none"
        />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}