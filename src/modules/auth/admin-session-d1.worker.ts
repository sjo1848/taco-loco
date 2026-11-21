import { env } from "cloudflare:workers";
import { findAdminSessionNative, isAdminSessionHashActiveNative } from "./admin-session-native";

export const findAdminSessionWorker = (tokenHash: string) => findAdminSessionNative(env.DB, tokenHash);
export const isAdminSessionHashActiveWorker = (tokenHash: string) => isAdminSessionHashActiveNative(env.DB, tokenHash);
