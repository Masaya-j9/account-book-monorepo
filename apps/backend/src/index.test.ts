import { describe, expect, it } from 'vitest';

describe('Sample Backend Test', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should test string concatenation', () => {
    const result = 'Hello' + ' ' + 'World';
    expect(result).toBe('Hello World');
  });
});
