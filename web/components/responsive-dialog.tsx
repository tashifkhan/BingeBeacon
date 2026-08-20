import type { ReactNode } from "react";
import { BottomSheet } from "@/components/motion/bottom-sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsDesktop } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  /** Rendered instead of the plain string title (e.g. with a poster thumb). */
  titleSlot?: ReactNode;
  className?: string;
}

/**
 * One overlay, two native-feeling presentations: a drag-dismissable bottom
 * sheet on phones, a centred modal once there's a cursor and room for it.
 *
 * A centred modal on a phone is the single most common "ported from desktop"
 * tell — it puts controls under the thumb-unfriendly top of the screen and
 * offers no swipe-to-dismiss.
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  titleSlot,
  className,
}: ResponsiveDialogProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn("sm:max-w-md", className)}>
          <DialogHeader>
            <DialogTitle className="font-display">
              {titleSlot ?? title}
            </DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    // The sheet draws its own header from `title`/`description` and uses the
    // title as the dialog's accessible name, so `titleSlot` (a desktop-only
    // flourish) is deliberately not repeated here.
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      snapPoints={["auto"]}
      className={className}
    >
      <div className="pb-safe">{children}</div>
    </BottomSheet>
  );
}
