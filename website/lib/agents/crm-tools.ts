import { implementToolFactory } from "@orpc/ai-sdk";
import { call } from "@orpc/server";
import { addNote, listActivities } from "../../routers/activities";
import {
  createContact,
  deleteContact,
  getContact,
  listContacts,
  updateContact,
} from "../../routers/contacts";
import { createDeal, deleteDeal, listDeals, moveDeal, updateDeal } from "../../routers/deals";
import {
  createTask,
  deleteTask,
  listTasks,
  setTaskCompleted,
  updateTask,
} from "../../routers/tasks";
import { getWorkspace } from "../../routers/workspace";
import { verifiedWorkspaceContext } from "../../routers/context";

// Procedures validate new outputs. Persisted conversations also contain older
// output shapes, so let the UI message reader accept those historical results.
function forAgent<T extends { outputSchema?: unknown }>(tool: T) {
  return { ...tool, outputSchema: undefined };
}

export function createCrmTools(tenantId: string, subjectId: string) {
  const implementTool = implementToolFactory();
  const context = verifiedWorkspaceContext(tenantId, subjectId);
  return {
    getWorkspace: forAgent(
      implementTool(getWorkspace, {
        execute: (input, options) =>
          call(getWorkspace, input, { context, signal: options.abortSignal }),
      }),
    ),
    getContact: forAgent(
      implementTool(getContact, {
        execute: (input, options) =>
          call(getContact, input, { context, signal: options.abortSignal }),
      }),
    ),
    createContact: forAgent(
      implementTool(createContact, {
        execute: (input, options) =>
          call(createContact, input, { context, signal: options.abortSignal }),
      }),
    ),
    updateContact: forAgent(
      implementTool(updateContact, {
        execute: (input, options) =>
          call(updateContact, input, { context, signal: options.abortSignal }),
      }),
    ),
    deleteContact: forAgent(
      implementTool(deleteContact, {
        execute: (input, options) =>
          call(deleteContact, input, { context, signal: options.abortSignal }),
      }),
    ),
    updateDeal: forAgent(
      implementTool(updateDeal, {
        execute: (input, options) =>
          call(updateDeal, input, { context, signal: options.abortSignal }),
      }),
    ),
    deleteDeal: forAgent(
      implementTool(deleteDeal, {
        execute: (input, options) =>
          call(deleteDeal, input, { context, signal: options.abortSignal }),
      }),
    ),
    updateTask: forAgent(
      implementTool(updateTask, {
        execute: (input, options) =>
          call(updateTask, input, { context, signal: options.abortSignal }),
      }),
    ),
    deleteTask: forAgent(
      implementTool(deleteTask, {
        execute: (input, options) =>
          call(deleteTask, input, { context, signal: options.abortSignal }),
      }),
    ),
    listActivities: forAgent(
      implementTool(listActivities, {
        execute: (input, options) =>
          call(listActivities, input, { context, signal: options.abortSignal }),
      }),
    ),
    addNote: forAgent(
      implementTool(addNote, {
        execute: (input, options) => call(addNote, input, { context, signal: options.abortSignal }),
      }),
    ),
    listDeals: forAgent(
      implementTool(listDeals, {
        execute: (input, options) =>
          call(listDeals, input, { context, signal: options.abortSignal }),
      }),
    ),
    listContacts: forAgent(
      implementTool(listContacts, {
        execute: (input, options) =>
          call(listContacts, input, { context, signal: options.abortSignal }),
      }),
    ),
    createDeal: forAgent(
      implementTool(createDeal, {
        execute: (input, options) =>
          call(createDeal, input, { context, signal: options.abortSignal }),
      }),
    ),
    moveDeal: forAgent(
      implementTool(moveDeal, {
        execute: (input, options) =>
          call(moveDeal, input, { context, signal: options.abortSignal }),
      }),
    ),
    listTasks: forAgent(
      implementTool(listTasks, {
        execute: (input, options) =>
          call(listTasks, input, { context, signal: options.abortSignal }),
      }),
    ),
    createTask: forAgent(
      implementTool(createTask, {
        execute: (input, options) =>
          call(createTask, input, { context, signal: options.abortSignal }),
      }),
    ),
    setTaskCompleted: forAgent(
      implementTool(setTaskCompleted, {
        execute: (input, options) =>
          call(setTaskCompleted, input, { context, signal: options.abortSignal }),
      }),
    ),
  };
}
