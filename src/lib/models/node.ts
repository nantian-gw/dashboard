import type { NodeRow } from "./types";

import { asArray, asObject, asString } from "./types";

export function mapNodePayload(payload: unknown): NodeRow[] {
  return asArray(payload).map((node) => {
    const item = asObject(node);
    const lastAckVersion = asString(item.lastAckVersion);
    const lastSentVersion = asString(item.lastSentVersion);
    const connected = item.connected !== false;

    // A node is ready when: connected, explicitly marked ready, AND has acked
    // at least one snapshot (has a lastAckVersion). If connected but never acked,
    // treat as "Unknown" rather than "Ready" since the node may be stuck.
    const ready = connected
      && item.ready === true
      && lastAckVersion.length > 0;

    const status = connected
      ? (ready ? "Ready" : "Unknown")
      : "Disconnected";

    return {
      name: asString(item.nodeId),
      connected,
      ready,
      status,
      ackState: connected ? asString(item.lastConfigStatus, ready ? "ACK" : "Unknown") : "Disconnected",
      snapshotVersion: lastAckVersion || lastSentVersion,
      lastSeen: asString(item.lastSeenAt),
      drifted: connected && Boolean(lastAckVersion && lastSentVersion && lastAckVersion !== lastSentVersion),
    };
  });
}
