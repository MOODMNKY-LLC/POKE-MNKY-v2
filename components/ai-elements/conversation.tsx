"use client";

import { Button } from "@/components/ui/button";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type ConversationProps = ComponentProps<typeof MessageScroller>;

export const Conversation = ({ className, children, ...props }: ConversationProps) => (
  <MessageScrollerProvider autoScroll>
    <MessageScroller
      className={cn("relative min-h-0 flex-1 overflow-hidden", className)}
      role="log"
      {...props}
    >
      {children}
    </MessageScroller>
  </MessageScrollerProvider>
);

export type ConversationContentProps = ComponentProps<typeof MessageScrollerContent>;

export const ConversationContent = ({
  className,
  ...props
}: ConversationContentProps) => (
  <MessageScrollerViewport className="scrollbar-hide size-full min-h-0">
    <MessageScrollerContent
      className={cn("flex flex-col gap-8 p-4", className)}
      {...props}
    />
  </MessageScrollerViewport>
);

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
};

export const ConversationEmptyState = ({
  className,
  title = "No messages yet",
  description = "Start a conversation to see messages here",
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) => (
  <div
    className={cn(
      "flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
      className
    )}
    {...props}
  >
    {children ?? (
      <>
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div className="space-y-1">
          <h3 className="font-medium text-sm">{title}</h3>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
      </>
    )}
  </div>
);

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

export const ConversationScrollButton = ({
  className,
  ...props
}: ConversationScrollButtonProps) => (
  <MessageScrollerButton
    aria-label="Scroll to bottom"
    className={cn("min-h-11 min-w-11", className)}
    size="icon"
    type="button"
    variant="outline"
    {...props}
  />
);
