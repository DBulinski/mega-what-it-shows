// The problems inside a merged ticket. Counted the desk's way: causes.ts places every report by
// its tenant and form (as CauseTable does). The desk also reads some reports as a one-day move
// (desk-notes.json). That is its own problem with its own ticket, but its reports stay counted
// where they are filed, so `shift` overlaps `parser`.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'shift' | 'unplaced';

export type ProblemGroup = { problem: Problem; reports: Report[]; tenants: number; firstSeen: string; lastSeen: string };

function group(problem: Problem, rs: Report[]): ProblemGroup {
  const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
  return { problem, reports: rs, tenants: new Set(rs.map((r) => r.tenant)).size, firstSeen: days[0], lastSeen: days[days.length - 1] };
}

export function problemsIn(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  shiftIds: readonly string[],
): { total: number; groups: ProblemGroup[] } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const byCause = new Map<Problem, Report[]>();
  for (const r of merged) {
    const p = causeOf(r, tenantOf(r)) ?? 'unplaced';
    byCause.set(p, [...(byCause.get(p) ?? []), r]);
  }
  const groups = [...byCause.entries()].map(([p, rs]) => group(p, rs)).sort((a, b) => b.reports.length - a.reports.length);
  const shifted = merged.filter((r) => shiftIds.includes(r.id));
  if (shifted.length) groups.push(group('shift', shifted));
  return { total: merged.length, groups };
}
