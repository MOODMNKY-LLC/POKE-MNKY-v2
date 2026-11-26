"use client";

import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { StreamdownWrapper } from "@/components/streamdown-wrapper";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";
import { cn } from "@/lib/utils";
import { BrainIcon, LoaderCircleIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { createContext, memo, useContext, useEffect, useRef, useState } from "react";

type ReasoningContextValue = {
  isStreaming: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  duration: number | undefined;
};

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

export const useReasoning = () => {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error("Reasoning components must be used within Reasoning");
  }
  return context;
};

export type ReasoningProps = ComponentProps<typeof TraceCollapsible> & {
  isStreaming?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  duration?: number;
};

const AUTO_CLOSE_DELAY = 1000;
const MS_IN_S = 1000;

export const Reasoning = memo(
  ({
    className,
    isStreaming = false,
    open,
    defaultOpen = true,
    onOpenChange,
    duration: durationProp,
    children,
    ...props
  }: ReasoningProps) => {
    const [isOpen, setIsOpen] = useControllableState({
      prop: open,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    });
    const [duration, setDuration] = useControllableState({
      prop: durationProp,
      defaultProp: undefined,
    });
    const [userToggled, setUserToggled] = useState(false);
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
      if (isStreaming) {
        if (startTimeRef.current === null) startTimeRef.current = Date.now();
        return;
      }
      if (startTimeRef.current !== null) {
        const elapsed = Math.ceil((Date.now() - startTimeRef.current) / MS_IN_S);
        startTimeRef.current = null;
        setDuration(elapsed);
      }
    }, [isStreaming, setDuration]);

    useEffect(() => {
      if (open !== undefined || userToggled) return;
      if (isStreaming) {
        setIsOpen(true);
        return;
      }
      const timer = setTimeout(() => setIsOpen(false), AUTO_CLOSE_DELAY);
      return () => clearTimeout(timer);
    }, [isStreaming, open, setIsOpen, userToggled]);

    const handleOpenChange = (next: boolean) => {
      setUserToggled(true);
      setIsOpen(next);
    };

    return (
      <ReasoningContext.Provider
        value={{ isStreaming, isOpen: Boolean(isOpen), setIsOpen, duration }}
      >
        <Trace className={cn("not-prose mb-4", className)}>
          <TraceCollapsible open={Boolean(isOpen)} onOpenChange={handleOpenChange} {...props}>
            {children}
          </TraceCollapsible>
        </Trace>
      </ReasoningContext.Provider>
    );
  }
);

export type ReasoningTriggerProps = ComponentProps<typeof TraceCollapsibleTrigger> & {
  getThinkingMessage?: (isStreaming: boolean, duration?: number) => ReactNode;
};

const defaultGetThinkingMessage = (isStreaming: boolean, duration?: number) => {
  if (isStreaming || duration === 0) return "Thinking";
  if (duration === undefined) return "Thought for a few seconds";
  return `Thought for ${duration} seconds`;
};

export const ReasoningTrigger = memo(
  ({
    className,
    children,
    getThinkingMessage = defaultGetThinkingMessage,
    ...props
  }: ReasoningTriggerProps) => {
    const { isStreaming, duration } = useReasoning();
    const label = getThinkingMessage(isStreaming, duration);

    return (
      <TraceCollapsibleTrigger className={className} {...props}>
        {children ?? (
          <TraceLine status={isStreaming ? "running" : undefined}>
            <TraceIcon>
              {isStreaming ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <BrainIcon />
              )}
            </TraceIcon>
            <TraceTitle>{label}</TraceTitle>
            {!isStreaming && duration ? <TraceDescription>{duration}s</TraceDescription> : null}
          </TraceLine>
        )}
      </TraceCollapsibleTrigger>
    );
  }
);

export type ReasoningContentProps = ComponentProps<"div"> & {
  children: string;
};

export const ReasoningContent = memo(
  ({ className, children, ...props }: ReasoningContentProps) => (
    <TraceCollapsibleContent className={cn("text-sm", className)} {...props}>
      <StreamdownWrapper>{children}</StreamdownWrapper>
    </TraceCollapsibleContent>
  )
);

Reasoning.displayName = "Reasoning";
ReasoningTrigger.displayName = "ReasoningTrigger";
ReasoningContent.displayName = "ReasoningContent";
