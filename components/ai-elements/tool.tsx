"use client";

import { Badge } from "@/components/ui/badge";
import { CodeBlock, CodeBlockContent } from "@/components/ui/code-block";
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
import type { ToolUIPart } from "ai";
import {
  CheckCircleIcon,
  CircleIcon,
  ClockIcon,
  TerminalIcon,
  XCircleIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { isValidElement } from "react";

export type ToolPart = ToolUIPart;
export type ToolProps = ComponentProps<typeof TraceCollapsible>;

export const Tool = ({ className, children, ...props }: ToolProps) => (
  <Trace className={cn("not-prose mb-4 w-full", className)}>
    <TraceCollapsible {...props}>{children}</TraceCollapsible>
  </Trace>
);

export type ToolHeaderProps = {
  title?: string;
  type: ToolUIPart["type"] | string;
  state: ToolUIPart["state"];
  className?: string;
};

type ToolStatus = {
  status?: "running" | "error";
  verb: string;
};

function toolStatus(state: ToolUIPart["state"]): ToolStatus {
  switch (state) {
    case "input-streaming":
    case "input-available":
    case "approval-requested":
      return { status: "running", verb: "Running" };
    case "approval-responded":
      return { verb: "Responded" };
    case "output-available":
      return { verb: "Ran" };
    case "output-error":
      return { status: "error", verb: "Failed to run" };
    case "output-denied":
      return { verb: "Denied" };
    default: {
      const exhaustive: never = state;
      return { verb: exhaustive };
    }
  }
}

export const getStatusBadge = (status: ToolUIPart["state"]) => {
  const labels: Record<ToolUIPart["state"], string> = {
    "input-streaming": "Pending",
    "input-available": "Running",
    "approval-requested": "Awaiting Approval",
    "approval-responded": "Responded",
    "output-available": "Completed",
    "output-error": "Error",
    "output-denied": "Denied",
  };

  const icons: Record<ToolUIPart["state"], ReactNode> = {
    "input-streaming": <CircleIcon className="size-4" />,
    "input-available": <ClockIcon className="size-4 animate-pulse" />,
    "approval-requested": <ClockIcon className="size-4 text-yellow-600" />,
    "approval-responded": <CheckCircleIcon className="size-4 text-blue-600" />,
    "output-available": <CheckCircleIcon className="size-4 text-green-600" />,
    "output-error": <XCircleIcon className="size-4 text-red-600" />,
    "output-denied": <XCircleIcon className="size-4 text-orange-600" />,
  };

  return (
    <Badge className="gap-1.5 rounded-full text-xs" variant="secondary">
      {icons[status]}
      {labels[status]}
    </Badge>
  );
};

export const ToolHeader = ({ className, title, type, state, ...props }: ToolHeaderProps) => {
  const name = title ?? type.split("-").slice(1).join("-");
  const status = toolStatus(state);
  return (
    <TraceCollapsibleTrigger className={className} {...props}>
      <TraceLine status={status.status}>
        <TraceIcon>
          <TerminalIcon />
        </TraceIcon>
        <TraceTitle>
          {status.verb} {name}
        </TraceTitle>
      </TraceLine>
    </TraceCollapsibleTrigger>
  );
};

export type ToolContentProps = ComponentProps<"div">;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <TraceCollapsibleContent className={className} {...props} />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolUIPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn("space-y-2 overflow-hidden", className)} {...props}>
    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      Parameters
    </h4>
    <CodeBlock size="sm">
      <CodeBlockContent wrap className="max-h-64">
        {JSON.stringify(input, null, 2)}
      </CodeBlockContent>
    </CodeBlock>
  </div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ToolUIPart["output"];
  errorText: ToolUIPart["errorText"];
};

export const ToolOutput = ({ className, output, errorText, ...props }: ToolOutputProps) => {
  if (!(output || errorText)) return null;

  let text = "";
  if (errorText) text = errorText;
  else if (typeof output === "string") text = output;
  else if (typeof output === "object" && !isValidElement(output)) text = JSON.stringify(output, null, 2);
  else text = String(output ?? "");

  return (
    <div className={cn("space-y-2", className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {errorText ? "Error" : "Result"}
      </h4>
      <CodeBlock size="sm" variant={errorText ? "destructive" : "default"}>
        <CodeBlockContent wrap className="max-h-64">
          {text}
        </CodeBlockContent>
      </CodeBlock>
    </div>
  );
};
