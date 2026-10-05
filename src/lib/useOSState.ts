import { useSyncExternalStore } from "react";
import { getOSState, subscribeOS } from "./harogatos";

export function useOSState() {
  return useSyncExternalStore(subscribeOS, getOSState, getOSState);
}
