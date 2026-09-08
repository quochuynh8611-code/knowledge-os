import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyTextToClipboard } from '../../src/lib/clipboard';

describe('copyTextToClipboard utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true and calls navigator.clipboard.writeText when API is available', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    const result = await copyTextToClipboard('Hello, Markdown!');

    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledOnce();
    expect(writeTextMock).toHaveBeenCalledWith('Hello, Markdown!');
  });

  it('returns true for empty string (valid copy of empty content)', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    const result = await copyTextToClipboard('');
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('');
  });

  it('falls through to execCommand fallback when clipboard.writeText rejects (permission denied)', async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    // Define execCommand on document so vi.spyOn can intercept it
    if (!document.execCommand) {
      Object.defineProperty(document, 'execCommand', {
        value: () => false,
        writable: true,
        configurable: true,
      });
    }
    const execCommandMock = vi.spyOn(document, 'execCommand').mockReturnValue(true);

    const result = await copyTextToClipboard('Fallback content');

    expect(writeTextMock).toHaveBeenCalledOnce();
    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(result).toBe(true);
  });

  it('returns false when clipboard.writeText rejects and execCommand is unavailable', async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error('Not allowed'));
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    // Ensure execCommand is not available (simulating environment without it)
    const originalExecCommand = Object.getOwnPropertyDescriptor(document, 'execCommand');
    Object.defineProperty(document, 'execCommand', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const result = await copyTextToClipboard('Some text');
    expect(result).toBe(false);

    // Restore
    if (originalExecCommand) {
      Object.defineProperty(document, 'execCommand', originalExecCommand);
    }
  });

  it('does not throw when clipboard API is completely absent and falls back gracefully', async () => {
    // Temporarily remove clipboard from navigator
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });

    // Define execCommand on document so fallback can succeed
    if (!document.execCommand) {
      Object.defineProperty(document, 'execCommand', {
        value: () => true,
        writable: true,
        configurable: true,
      });
    }
    vi.spyOn(document, 'execCommand').mockReturnValue(true);

    const result = await copyTextToClipboard('No clipboard API');
    expect(result).toBe(true);

    // Restore
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    }
  });

  it('[#13] textarea is always removed from DOM even when execCommand throws', async () => {
    // Remove clipboard API to force fallback path
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });

    // Define and then mock execCommand to THROW
    if (!document.execCommand) {
      Object.defineProperty(document, 'execCommand', {
        value: () => false,
        writable: true,
        configurable: true,
      });
    }
    vi.spyOn(document, 'execCommand').mockImplementation(() => {
      throw new Error('execCommand threw unexpectedly');
    });

    const bodyChildCountBefore = document.body.children.length;

    const result = await copyTextToClipboard('Throw test');

    // Must return false, not throw
    expect(result).toBe(false);

    // textarea must have been removed (finally block ran)
    expect(document.body.children.length).toBe(bodyChildCountBefore);

    // Restore
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    }
  });
});
