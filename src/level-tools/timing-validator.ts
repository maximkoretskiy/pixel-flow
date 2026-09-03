import type { LevelDefinition, TimedLaunch } from '../core/model';
import { replayLevel } from '../core/replay';

const JITTER_MS = 150;
const MINIMUM_INPUT_SPACING_MS = 300;

export type TimingValidationResult =
  | { readonly ok: true; readonly schedulesChecked: number }
  | {
      readonly ok: false;
      readonly reason: 'input-spacing' | 'jitter-failed';
      readonly scheduleIndex: number;
    };

function shiftLaunch(launch: TimedLaunch, offsetMs: number): TimedLaunch {
  return { atMs: launch.atMs + offsetMs, source: { ...launch.source } };
}

function normalizeNonNegative(schedule: readonly TimedLaunch[]): readonly TimedLaunch[] {
  const firstAtMs = schedule[0]?.atMs ?? 0;
  if (firstAtMs >= 0) return schedule;
  return schedule.map((launch) => shiftLaunch(launch, -firstAtMs));
}

export function buildJitterSchedules(
  witness: readonly TimedLaunch[],
): readonly (readonly TimedLaunch[])[] {
  const nominal = witness.map((launch) => shiftLaunch(launch, 0));
  const schedules: Array<readonly TimedLaunch[]> = [
    nominal,
    normalizeNonNegative(witness.map((launch) => shiftLaunch(launch, -JITTER_MS))),
    witness.map((launch) => shiftLaunch(launch, JITTER_MS)),
    normalizeNonNegative(witness.map((launch, index) =>
      shiftLaunch(launch, index % 2 === 0 ? -JITTER_MS : JITTER_MS))),
  ];
  witness.forEach((_launch, changedIndex) => {
    schedules.push(normalizeNonNegative(witness.map((launch, index) =>
      shiftLaunch(launch, index === changedIndex ? -JITTER_MS : 0))));
    schedules.push(witness.map((launch, index) =>
      shiftLaunch(launch, index === changedIndex ? JITTER_MS : 0)));
  });
  return schedules;
}

function hasValidSpacing(schedule: readonly TimedLaunch[]): boolean {
  return schedule.every((launch, index) => {
    if (launch.atMs < 0) return false;
    return index === 0 || launch.atMs - schedule[index - 1].atMs >= MINIMUM_INPUT_SPACING_MS;
  });
}

export function validateHumanTiming(
  level: LevelDefinition,
  witness: readonly TimedLaunch[],
): TimingValidationResult {
  const schedules = buildJitterSchedules(witness);
  for (const [scheduleIndex, schedule] of schedules.entries()) {
    if (!hasValidSpacing(schedule)) return { ok: false, reason: 'input-spacing', scheduleIndex };
    if (replayLevel(level, schedule).phase !== 'won') {
      return { ok: false, reason: 'jitter-failed', scheduleIndex };
    }
  }
  return { ok: true, schedulesChecked: schedules.length };
}
