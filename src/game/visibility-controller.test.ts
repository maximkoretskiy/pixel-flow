import { describe, expect, it } from 'vitest';
import { handleVisibility } from './visibility-controller';

describe('handleVisibility', () => {
  it('pauses when hidden and never resumes automatically', () => {
    const commands: string[] = [];
    handleVisibility(true, () => commands.push('pause'));
    handleVisibility(false, () => commands.push('pause'));
    expect(commands).toEqual(['pause']);
  });
});
