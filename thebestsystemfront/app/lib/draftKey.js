// One row can have an unsaved draft for "Accept" and a separate one for
// "Next time" at the same time, so the key includes which popup it's for.
export function draftKey(table, id, kind) {
  return `${table}:${id}:${kind}`;
}
