import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createAgentUIStream,
  isStepCount,
  readUIMessageStream,
  simulateReadableStream,
  tool,
  ToolLoopAgent,
  type UIMessage,
} from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { z } from "zod";
import { toolTimingMetadata, type AgentMessageMetadata } from "../lib/agents/tool-timing";

void test("tool durations reach streamed messages and saved checkpoints across steps, including errors", async () => {
  const usage = {
    inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: 10, text: 10, reasoning: undefined },
  };
  const model = new MockLanguageModelV4({
    doStream: ["first", "second"].map((toolCallId) => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "tool-call" as const, toolCallId, toolName: "work", input: "{}" },
          {
            type: "finish" as const,
            finishReason: { unified: "tool-calls" as const, raw: undefined },
            usage,
          },
        ],
      }),
    })),
  });
  const agent = new ToolLoopAgent({
    model,
    stopWhen: isStepCount(2),
    tools: {
      work: tool({
        inputSchema: z.object({}),
        execute: async function* (_, { toolCallId }) {
          yield "Working";
          if (toolCallId === "second") throw new Error("Tool failed");
          yield "Done";
        },
      }),
    },
  });
  type TimedMessage = UIMessage<AgentMessageMetadata>;
  const checkpoints: UIMessage[][] = [];
  let saved: UIMessage[] = [];
  const stream = await createAgentUIStream({
    agent,
    uiMessages: [{ id: "user", role: "user", parts: [{ type: "text", text: "Work twice" }] }],
    messageMetadata: toolTimingMetadata,
    onUIMessageStepEnd: ({ messages }) => {
      checkpoints.push(structuredClone(messages));
    },
    onEnd: ({ messages }) => {
      saved = structuredClone(messages);
    },
  });
  let final: TimedMessage | undefined;
  for await (const message of readUIMessageStream<TimedMessage>({ stream })) final = message;
  const durations = final?.metadata?.toolDurations;
  assert.ok(durations);
  assert.deepEqual(Object.keys(durations).sort(), ["first", "second"]);
  for (const duration of Object.values(durations)) {
    assert.ok(Number.isFinite(duration) && duration >= 0);
  }
  assert.deepEqual(checkpoints[0].at(-1)?.metadata, { toolDurations: { first: durations.first } });
  assert.deepEqual(checkpoints[1].at(-1)?.metadata, { toolDurations: durations });
  assert.deepEqual(saved.at(-1)?.metadata, { toolDurations: durations });
  assert.ok(
    final?.parts.some((part) => part.type === "tool-work" && part.state === "output-error"),
  );
  assert.equal(
    toolTimingMetadata({ part: { type: "text-delta", id: "text", text: "Hello" } }),
    undefined,
  );
});
