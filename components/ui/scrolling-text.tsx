"use client"

import { cn } from "@/lib/utils"
import { ComponentPropsWithoutRef } from "react"

interface ScrollingTextProps extends ComponentPropsWithoutRef<"div"> {
  text: string
  speed?: number
  pauseOnHover?: boolean
  className?: string
  maxWidth?: string
}

export function ScrollingText({
  text,
  speed = 20,
  pauseOnHover = true,
  className,
  maxWidth = "240px",
  ...props
}: ScrollingTextProps) {
  // Duplicate text for seamless loop with separator
  const duplicatedText = `${text} • ${text}`

  return (
    <div
      {...props}
      className={cn(
        "relative overflow-hidden whitespace-nowrap",
        pauseOnHover && "group",
        className
      )}
      style={{
        maxWidth,
        minWidth: "180px", // Minimum width to ensure icon has space
      }}
    >
      <div
        className={cn(
          "inline-block animate-scroll-text",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
        style={{
          animationDuration: `${speed}s`,
        }}
      >
        {duplicatedText}
      </div>
    </div>
  )
}
