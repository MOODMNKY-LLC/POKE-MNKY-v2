"use client";

/**
 * Streamdown Wrapper Component
 * 
 * This component isolates streamdown from Turbopack's build-time evaluation
 * to prevent HMR errors with micromark/debug dependencies.
 * 
 * Uses React.lazy() with Suspense to completely isolate from Turbopack analysis.
 */

import { lazy, Suspense, type ReactNode } from "react";

// Lazy load streamdown using React.lazy() - this prevents Turbopack from analyzing it
// The import is wrapped in a function that's only called at runtime
const StreamdownLazy = lazy(() => {
  // Create a promise that loads streamdown only when this function is called
  return Promise.resolve().then(() => {
    // Use a dynamic import that Turbopack can't statically analyze
    return import("streamdown" as any).then((mod: any) => ({
      default: mod.Streamdown,
    }));
  });
});

// Define props type manually to avoid importing from streamdown (causes HMR issues)
export type StreamdownWrapperProps = {
  children?: ReactNode;
  className?: string;
  [key: string]: any; // Allow other props to pass through
};

/**
 * StreamdownWrapper - Isolated wrapper for streamdown component
 * 
 * This wrapper prevents Turbopack from evaluating streamdown and its
 * dependencies (micromark, debug) during build/HMR by using React.lazy().
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
    <Suspense fallback={<div className={className || ""}>{children}</div>}>
      <StreamdownLazy className={className} {...props}>
        {children}
      </StreamdownLazy>
    </Suspense>
  );
}
