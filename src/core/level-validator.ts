import { SUPPORTED_COLORS } from './model';
import type { LevelDefinition } from './model';

export class LevelValidationError extends Error {
  constructor(public readonly issues: readonly string[]) {
    super(`Invalid level:\n${issues.join('\n')}`);
    this.name = 'LevelValidationError';
  }
}

export function assertValidLevel(level: LevelDefinition): void {
  const issues: string[] = [];
  const colors = new Set<string>(SUPPORTED_COLORS);
  if (!level.id.trim()) issues.push('id must not be empty');
  if (!Number.isInteger(level.board.width) || level.board.width <= 0) issues.push('board.width must be a positive integer');
  if (!Number.isInteger(level.board.height) || level.board.height <= 0) issues.push('board.height must be a positive integer');
  if (level.stacks.length !== 4) issues.push('stacks must contain exactly 4 stacks');
  if (!Number.isFinite(level.speedTrackUnitsPerSecond) || level.speedTrackUnitsPerSecond <= 0) {
    issues.push('speedTrackUnitsPerSecond must be positive');
  }

  const occupied = new Set<string>();
  level.board.cells.forEach((cell, index) => {
    const key = `${cell.x},${cell.y}`;
    if (!Number.isInteger(cell.x) || !Number.isInteger(cell.y) || cell.x < 0 || cell.y < 0 ||
        cell.x >= level.board.width || cell.y >= level.board.height) {
      issues.push(`board.cells[${index}] is outside the board`);
    }
    if (occupied.has(key)) issues.push(`board.cells[${index}] duplicates coordinate ${key}`);
    occupied.add(key);
    if (!colors.has(cell.color)) issues.push(`board.cells[${index}].color is unsupported: ${cell.color}`);
  });

  level.stacks.forEach((stack, stackIndex) => stack.forEach((container, containerIndex) => {
    if (!colors.has(container.color)) issues.push(`stacks[${stackIndex}][${containerIndex}].color is unsupported: ${container.color}`);
    if (!Number.isInteger(container.ammo) || container.ammo <= 0) {
      issues.push(`stacks[${stackIndex}][${containerIndex}].ammo must be a positive integer`);
    }
  }));

  if (issues.length > 0) throw new LevelValidationError(issues);
}
