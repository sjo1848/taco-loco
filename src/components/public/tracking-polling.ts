export const initialTrackingPollDelay = 5000;
export const maxTrackingPollDelay = 30000;

export function nextTrackingPollDelay(current: number, succeeded: boolean) {
  return succeeded ? initialTrackingPollDelay : Math.min(current * 2, maxTrackingPollDelay);
}
