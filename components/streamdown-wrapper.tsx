"use client";

/**
 * Streamdown Wrapper Component
 * 
 * This component isolates streamdown from Turbopack's build-time evaluation
 * to prevent HMR errors with micromark/debug dependencies.
 * 
 * Uses React.lazy() instead of next/dynamic for better isolation.
 */

import { lazy, Suspense, ComponentProps } from "react";

// Lazy load streamdown only on client-side, completely isolated from build-time analysis
const StreamdownLazy = lazy(() =>
  import("streamdown").then((mod) => ({
    default: mod.Streamdown,
  }))
);

// Define props type manually to avoid importing from streamdown (causes HMR issues)
export type StreamdownWrapperProps = {
  children?: React.ReactNode;
  className?: string;
  [key: string]: any; // Allow other props to pass through
};

/**
 * StreamdownWrapper - Isolated wrapper for streamdown component
 * 
 * This wrapper prevents Turbopack from evaluating streamdown and its
 * dependencies (micromark, debug) during build/HMR, which causes
 * "module factory not available" errors.
 * 
 * Usage:
 * ```tsx
 * <StreamdownWrapper className="...">
 *   {markdownContent}
 * </StreamdownWrapper>
 * ```
 */
export function StreamdownWrapper({
  className,
  children,
  ...props
}: StreamdownWrapperProps) {
  return (
    <Suspense
      fallback={
        <div className={className || ""}>
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <StreamdownLazy className={className} {...props}>
        {children}
      </StreamdownLazy>
    </Suspense>
  );
}
