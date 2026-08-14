let counter = 0;

/**
 * Stable-enough unique id for an imported activity. Not crypto — it only has to be unique
 * within one project, where it links a Slot to its Activity across save/reload.
 */
export function newActivityId(): string {
  counter += 1;
  return `a${Date.now().toString(36)}${counter.toString(36)}`;
}
