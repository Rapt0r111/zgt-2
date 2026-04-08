"use client";

/**
 * components/ui/sheet.tsx
 * Slide-in drawer built on @radix-ui/react-dialog
 */

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet      = Dialog.Root;
export const SheetPortal = Dialog.Portal;

export function SheetOverlay({ className, ...props }: Dialog.DialogOverlayProps) {
  return (
    <Dialog.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
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
          "fixed z-50 flex flex-col bg-card border-border shadow-2xl",
          "focus:outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:duration-200 data-[state=open]:duration-300",
          side === "right" && [
            "inset-y-0 right-0 h-full w-full sm:max-w-xl border-l",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          ],
          side === "left" && [
            "inset-y-0 left-0 h-full w-full sm:max-w-xl border-r",
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
          ],
          className
        )}
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
      className={cn(
        "flex items-center justify-between px-6 py-4 border-b border-border shrink-0",
        className
      )}
      {...props}
    />
  );
}

export function SheetTitle({ className, ...props }: Dialog.DialogTitleProps) {
  return (
    <Dialog.Title
      className={cn("text-base font-semibold text-foreground", className)}
      {...props}
    />
  );
}

export function SheetDescription({ className, ...props }: Dialog.DialogDescriptionProps) {
  return (
    <Dialog.Description
      className={cn("text-sm text-muted-foreground mt-0.5", className)}
      {...props}
    />
  );
}

export function SheetClose({ className, ...props }: Dialog.DialogCloseProps) {
  return (
    <Dialog.Close
      className={cn(
        "rounded-md p-1.5 text-muted-foreground hover:text-foreground",
        "hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
        className
      )}
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
      className={cn("flex-1 overflow-y-auto px-6 py-5", className)}
      {...props}
    />
  );
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 px-6 py-4",
        "border-t border-border bg-muted/30 shrink-0",
        className
      )}
      {...props}
    />
  );
}

export const SheetTrigger = Dialog.Trigger;