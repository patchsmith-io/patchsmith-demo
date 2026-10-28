import type { TextStreamPart, ToolSet } from "ai";

export type AgentMessageMetadata = {
  toolDurations?: Record<string, number>;
};

export function toolTimingMetadata({
  part,
}: {
  part: TextStreamPart<ToolSet>;
}): AgentMessageMetadata | undefined {
  if (part.type === "finish-step" && Object.keys(part.performance.toolExecutionMs).length > 0) {
    return { toolDurations: { ...part.performance.toolExecutionMs } };
  }
}
