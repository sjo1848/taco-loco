import { env } from "cloudflare:workers";
import { applyD1WorkflowActionWith, createD1OrderWith, transitionD1OrderWith } from "@/modules/orders/d1-atomic";

export const createD1Order = (input: Parameters<typeof createD1OrderWith>[1]) => createD1OrderWith(env.DB, input);
export const transitionD1Order = (input: Parameters<typeof transitionD1OrderWith>[1]) => transitionD1OrderWith(env.DB, input);
export const applyD1WorkflowAction = (input: Parameters<typeof applyD1WorkflowActionWith>[1]) => applyD1WorkflowActionWith(env.DB, input);
