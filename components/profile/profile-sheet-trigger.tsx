"use client"

import { Button } from "@/components/ui/button"
import { User } from "lucide-react"

export const OPEN_PROFILE_SHEET_EVENT = "open-profile-sheet"

export function openProfileSheet() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_PROFILE_SHEET_EVENT))
  }
}

export function ProfileSheetTrigger({
  children,
  variant = "link",
  className,
}: {
  children?: React.ReactNode
  variant?: "link" | "outline" | "default"
  className?: string
}) {
  return (
    <Button
      variant={variant}
      className={className}
      onClick={openProfileSheet}
    >
      {children ?? (
        <>
          <User className="h-4 w-4 mr-2" />
          Open Profile
        </>
      )}
    </Button>
  )
}
