/**
 * Attach stable element identities to a sequence of array snapshots by
 * diffing consecutive steps. Lets bars/tiles FLIP-animate to their new
 * positions on swaps, shifts, inserts and deletes — without touching the
 * step generators.
 *
 * Matching is greedy left-to-right against the previous step's live ids,
 * so the minimal set of elements appears to move. Duplicate values are
 * interchangeable (a swap of equals is visually a no-op, as it should be).
 * Length changes yield fresh ids (enter) or dropped ids (exit).
 */
export type WithIds<T> = T & { ids: string[] };

export function attachIds<T extends { array: number[] }>(steps: T[]): WithIds<T>[] {
  let fresh = 0;
  const freshId = () => `n${fresh++}`;
  let prevArray: number[] = [];
  let prevIds: string[] = [];

  return steps.map((step, k) => {
    let ids: string[];
    if (k === 0) {
      ids = step.array.map((_, i) => `e${i}`);
    } else {
      const pool = new Map<number, string[]>();
      prevArray.forEach((v, i) => {
        const q = pool.get(v);
        if (q) q.push(prevIds[i]);
        else pool.set(v, [prevIds[i]]);
      });
      ids = step.array.map((v) => {
        const q = pool.get(v);
        if (q && q.length) return q.shift() as string;
        return freshId();
      });
    }
    prevArray = step.array;
    prevIds = ids;
    return { ...step, ids };
  });
}
