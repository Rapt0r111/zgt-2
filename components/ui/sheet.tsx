"use client";

/**
 * components/ui/sheet.tsx — Aurora glass drawer
 */

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet       = Dialog.Root;
export const SheetPortal = Dialog.Portal;

export function SheetOverlay({ className, ...props }: Dialog.DialogOverlayProps) {
  return (
    <Dialog.Overlay
      className={cn(
        "fixed inset-0 z-50",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      {...props}
    />
  );
}

interface SheetContentProps extends Dialog.DialogContentProps {
  side?: "left" | "right";
}

export function SheetContent({
  side = "right",
  className,
  children,
  ...props
}: SheetContentProps) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <Dialog.Content
        className={cn(
          "fixed z-50 flex flex-col shadow-2xl focus:outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:duration-200 data-[state=open]:duration-300",
          side === "right" && [
            "inset-y-0 right-0 h-full w-full sm:max-w-xl",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          ],
          side === "left" && [
            "inset-y-0 left-0 h-full w-full sm:max-w-xl",
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
          ],
          className
        )}
        style={{
          background: "hsl(220 40% 8% / 0.95)",
          borderLeft: "1px solid hsl(220 30% 14%)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
        {...props}
      >
        {children}
      </Dialog.Content>
    </SheetPortal>
  );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between px-6 py-4 shrink-0", className)}
      style={{ borderBottom: "1px solid hsl(220 30% 14%)" }}
      {...props}
    />
  );
}

export function SheetTitle({ className, ...props }: Dialog.DialogTitleProps) {
  return (
    <Dialog.Title
      className={cn("text-base font-600", className)}
      style={{ color: "hsl(220 50% 95%)", fontWeight: 600 }}
      {...props}
    />
  );
}

export function SheetDescription({ className, ...props }: Dialog.DialogDescriptionProps) {
  return (
    <Dialog.Description
      className={cn("text-sm mt-0.5 text-muted-foreground", className)}
      {...props}
    />
  );
}

export function SheetClose({ className, ...props }: Dialog.DialogCloseProps) {
  return (
    <Dialog.Close
      className={cn(
        "rounded-lg p-1.5 transition-colors focus:outline-none",
        className
      )}
      style={{ color: "hsl(215 16% 40%)" }}
      aria-label="Закрыть"
      {...props}
    >
      <X className="w-4 h-4" />
    </Dialog.Close>
  );
}

export function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex-1 overflow-y-auto px-6 py-5 scrollbar-aurora", className)}
      {...props}
    />
  );
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-end gap-3 px-6 py-4 shrink-0", className)}
      style={{ borderTop: "1px solid hsl(220 30% 14%)", background: "hsl(220 40% 7%)" }}
      {...props}
    />
  );
}

export const SheetTrigger = Dialog.Trigger;