import "@testing-library/jest-dom";
import { vi, afterEach } from "vitest";

// Mock localStorage
const localStorageMock = (function () {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((idx: number) => Object.keys(store)[idx] || null),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Hermetic Test Network Guard (ADR-077)
// Blocks unmocked live network calls during test execution
const hermeticFetch = (
  input: RequestInfo | URL,
  _init?: RequestInit
): Promise<Response> => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : (input as Request)?.url || String(input);

  return Promise.reject(
    new Error(`[Hermetic Guard] Unmocked live network call blocked: ${url}`)
  );
};

const installHermeticFetch = () => {
  globalThis.fetch = hermeticFetch as unknown as typeof fetch;
  if (typeof window !== "undefined") {
    window.fetch = hermeticFetch as unknown as typeof fetch;
  }
};

installHermeticFetch();

afterEach(() => {
  installHermeticFetch();
});
