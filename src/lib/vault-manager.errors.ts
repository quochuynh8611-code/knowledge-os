export class VaultError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MissingVaultIdError extends VaultError {
  constructor(message = "Property 'vaultId' is required.") {
    super(message, "MISSING_VAULT_ID", 400);
  }
}

export class InvalidVaultIdError extends VaultError {
  constructor(message = "Provided 'vaultId' is invalid.") {
    super(message, "INVALID_VAULT_ID", 400);
  }
}

export class VaultNotFoundError extends VaultError {
  constructor(vaultId: string) {
    super(`Vault profile '${vaultId}' was not found in registry.`, "VAULT_NOT_FOUND", 404);
  }
}

export class VaultSwitchInProgressError extends VaultError {
  constructor(message = "A vault switch operation is currently in progress.") {
    super(message, "SWITCH_IN_PROGRESS", 409);
  }
}

export class VaultSwitchFailedError extends VaultError {
  constructor(message = "Failed to prepare and activate target vault.") {
    super(message, "SWITCH_FAILED", 500);
  }
}
