import type { PublicOrderStage } from "@/modules/orders/public-tracking";

export const terminalTrackingStages: PublicOrderStage[] = ["COMPLETED", "CANCELLED", "EXPIRED", "REFUNDED"];
export const initialTrackingPollDelay = 5000;
export const maxTrackingPollDelay = 30000;

export function nextTrackingPollDelay(current: number, succeeded: boolean) {
  return succeeded ? initialTrackingPollDelay : Math.min(current * 2, maxTrackingPollDelay);
}
