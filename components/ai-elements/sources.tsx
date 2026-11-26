"use client";

import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";
import { cn } from "@/lib/utils";
import { ArrowUpRightIcon, BookIcon, GlobeIcon } from "lucide-react";
import type { ComponentProps } from "react";

export type SourcesProps = ComponentProps<"div">;

export const Sources = ({ className, children, ...props }: SourcesProps) => (
  <Trace className={cn("not-prose mb-4 text-xs", className)} {...props}>
    <TraceCollapsible>{children}</TraceCollapsible>
  </Trace>
);

export type SourcesTriggerProps = ComponentProps<"button"> & {
  count: number;
};

export const SourcesTrigger = ({
  className,
  count,
  children,
  ...props
}: SourcesTriggerProps) => (
  <TraceCollapsibleTrigger className={cn("flex items-center gap-2", className)} {...props}>
    {children ?? (
      <TraceLine>
        <TraceIcon>
          <GlobeIcon />
        </TraceIcon>
        <TraceTitle>Used {count} sources</TraceTitle>
      </TraceLine>
    )}
  </TraceCollapsibleTrigger>
);

export type SourcesContentProps = ComponentProps<"div">;

export const SourcesContent = ({ className, children, ...props }: SourcesContentProps) => (
  <TraceCollapsibleContent className={className} {...props}>
    <Trace>{children}</Trace>
  </TraceCollapsibleContent>
);

export type SourceProps = ComponentProps<"a">;

export const Source = ({ href, title, children, ...props }: SourceProps) => (
  <a href={href} rel="noreferrer" target="_blank" {...props}>
    {children ?? (
      <TraceLine>
        <TraceIcon>
          <BookIcon />
        </TraceIcon>
        <TraceTitle>
          {title}
          <span className="sr-only"> (opens in a new tab)</span>
        </TraceTitle>
        <TraceIcon>
          <ArrowUpRightIcon />
        </TraceIcon>
      </TraceLine>
    )}
  </a>
);
