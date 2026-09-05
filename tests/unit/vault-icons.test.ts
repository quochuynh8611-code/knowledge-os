import { describe, it, expect } from "vitest";
import { getVaultIcon } from "../../src/lib/vault-icons";

describe("Phase P4.3D: Vault Icons Mapping", () => {
  it("returns 🔬 for research or study vaults", () => {
    expect(getVaultIcon("research-notes")).toBe("🔬");
    expect(getVaultIcon("my-study-vault")).toBe("🔬");
  });

  it("returns 📓 for journal or diary vaults", () => {
    expect(getVaultIcon("daily-journal")).toBe("📓");
    expect(getVaultIcon("personal-diary")).toBe("📓");
  });

  it("returns 🪷 for phat-hoc, buddhism or zen vaults", () => {
    expect(getVaultIcon("phat-hoc-vault")).toBe("🪷");
    expect(getVaultIcon("zen-notes")).toBe("🪷");
  });

  it("returns ☯️ for huyen-hoc or fengshui vaults", () => {
    expect(getVaultIcon("huyen-hoc")).toBe("☯️");
    expect(getVaultIcon("phong-thuy-notes")).toBe("☯️");
  });

  it("returns 🌿 for dong-y or medicine vaults", () => {
    expect(getVaultIcon("dong-y")).toBe("🌿");
    expect(getVaultIcon("y-hoc-co-truyen")).toBe("🌿");
  });

  it("returns 💼 for business, work or sop vaults", () => {
    expect(getVaultIcon("business-sop")).toBe("💼");
    expect(getVaultIcon("work-vault")).toBe("💼");
  });

  it("returns 💻 for tech, code or dev vaults", () => {
    expect(getVaultIcon("code-snippets")).toBe("💻");
    expect(getVaultIcon("dev-vault")).toBe("💻");
  });

  it("returns 📁 for unknown or generic vaultId", () => {
    expect(getVaultIcon("random-unknown-vault")).toBe("📁");
    expect(getVaultIcon("")).toBe("📁");
  });
});
