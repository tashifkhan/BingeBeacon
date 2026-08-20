"use client"

import {
  AlertIcon,
  CheckCircleIcon,
  InfoIcon,
  WarningIcon,
} from "@/lib/icons"
import { Loader } from "@/components/motion/loader"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <CheckCircleIcon className="size-4 text-primary" />,
        info: <InfoIcon className="size-4" />,
        warning: <WarningIcon className="size-4 text-amber" />,
        error: <AlertIcon className="size-4 text-destructive" />,
        loading: <Loader variant="spinner" size={16} />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
