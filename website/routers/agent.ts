import { randomUUID } from "node:crypto";
import { consumeStream, createAgentUIStream, type UIMessageChunk } from "ai";
import { ORPCError, streamToAsyncIteratorObject } from "@orpc/server";
import { checkBotId } from "botid/server";
import { createTools } from "patchsmith/ai-sdk";
import { patchsmith } from "../lib/patchsmith-server";
import { protectedProcedure } from "./base";
import { createCrmAgent } from "../lib/agents/crm-agent";
import { AGENT_TIMEOUT_MS } from "../lib/agents/agent-limits";
import { agentRequest } from "../lib/agents/agent-request";
import { AGENT_BOT_CHECK_LEVEL } from "../lib/agents/agent-protection";
import { toolTimingMetadata } from "../lib/agents/tool-timing";
import { beginAgentChat, finishAgentMessages, saveAgentChat } from "./chats";

export const agentChat = protectedProcedure
  .input(agentRequest)
  .handler(async ({ input, context, signal }): Promise<AsyncIteratorObject<UIMessageChunk>> => {
    // Inference requires HTTP request identity and a response-lifetime hook.
    // Direct server/tool clients cannot bypass the browser bot check.
    const { request, afterResponse, tenant, resolveUserId } = context;
    if (!request || !afterResponse || !resolveUserId) throw new ORPCError("FORBIDDEN");
    // On Vercel, the SDK resolves the current OIDC token from trusted request
    // context. An environment-variable-only check would incorrectly block it.
    if (
      process.env.VERCEL !== "1" &&
      !process.env.AI_GATEWAY_API_KEY &&
      !process.env.VERCEL_OIDC_TOKEN &&
      !process.env.VERCEL_OIDC_TOKEN_FILE
    ) {
      throw new ORPCError("SERVICE_UNAVAILABLE", {
        message: "The agent is not connected yet. Please try again once it has been set up.",
      });
    }
    let streamConsumption: Promise<void> | undefined;
    afterResponse(async () => {
      // Drain on the server so disconnects still run persistence callbacks. The
      // request signal still cancels model generation and tool execution.
      try {
        await streamConsumption;
      } catch (error) {
        console.error("Agent stream consumption failed:", error);
      }
    });
    try {
      const verification = await checkBotId({
        advancedOptions: { checkLevel: AGENT_BOT_CHECK_LEVEL },
        developmentOptions: {
          isDevelopment: process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1",
        },
      });
      if (verification.isBot)
        throw new ORPCError("FORBIDDEN", {
          message: "This request could not be verified. Please use the app to send your message.",
        });
    } catch (error) {
      if (error instanceof ORPCError) throw error;
      console.error("Agent bot verification failed:", error);
      throw new ORPCError("SERVICE_UNAVAILABLE", {
        message: "The agent could not verify this request. Please try again.",
      });
    }
    let chatTurn;
    try {
      chatTurn = await beginAgentChat(tenant.id, input.chatId, input.messages);
    } catch (error) {
      if (error instanceof ORPCError) throw error;
      console.error("Agent chat could not be saved:", error);
      throw new ORPCError("SERVICE_UNAVAILABLE", {
        message: "This chat could not be saved. Please try again.",
      });
    }
    try {
      const subjectId = await resolveUserId();
      const patchsmithTools = createTools(patchsmith, {
        subjectId,
        scopes: { workspace: { workspaceId: tenant.id } },
      });
      const stream = await createAgentUIStream({
        agent: createCrmAgent(
          tenant,
          {
            subjectId,
            page: input.page,
            date: input.date ?? new Date().toISOString().slice(0, 10),
            timeZone: input.timeZone,
          },
          undefined,
          patchsmithTools,
        ),
        uiMessages: chatTurn.messages,
        generateMessageId: randomUUID,
        messageMetadata: toolTimingMetadata,
        onUIMessageStepEnd: ({ messages }) => saveAgentChat(chatTurn, messages),
        onEnd: ({ messages, outcome, isAborted, isCancelled }) =>
          saveAgentChat(
            chatTurn,
            finishAgentMessages(
              messages,
              isAborted || !!isCancelled || outcome.status !== "completed",
            ),
          ),
        abortSignal: signal ?? request.signal,
        timeout: AGENT_TIMEOUT_MS,
        onError: (error) => {
          console.error("Agent stream failed:", error);
          return "The agent could not finish this request. Please try again. Check the page before repeating a creation.";
        },
      });
      const [clientStream, serverStream] = stream.tee();
      streamConsumption = consumeStream({ stream: serverStream });
      return streamToAsyncIteratorObject(clientStream);
    } catch (error) {
      console.error("Agent request failed:", error);
      await saveAgentChat(chatTurn, chatTurn.messages);
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "The agent could not start this request. Please try again.",
      });
    }
  });
