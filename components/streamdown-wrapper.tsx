"use client";

/**
 * Streamdown wrapper.
 * Lazy-loaded so the markdown parser stays out of the first server render.
 */

import { code } from "@streamdown/code";
import { lazy, Suspense } from "react";
import "streamdown/styles.css";

export type StreamdownWrapperProps = {
  children?: string;
  className?: string;
};

const StreamdownLazy = lazy(() =>
  import("streamdown").then((mod) => ({
    default: function StreamdownWithCode({ children, className }: StreamdownWrapperProps) {
      return (
        <mod.Streamdown className={className} plugins={{ code }}>
          {children}
        </mod.Streamdown>
      );
    },
  })),
);

export function StreamdownWrapper({ className, children }: StreamdownWrapperProps) {
  return (
    <Suspense fallback={<div className={className || ""}>{children}</div>}>
      <StreamdownLazy className={className}>{children}</StreamdownLazy>
    </Suspense>
  );
}
