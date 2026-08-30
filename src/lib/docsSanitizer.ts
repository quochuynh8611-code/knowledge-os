import path from "path";

/**
 * Path Sanitization & Security Guard for Docs Explorer
 *
 * Ensures only valid markdown (.md) and feature (.feature) files strictly within
 * the docs root directory can be resolved. Prevents path traversal, null byte injections,
 * and access to sensitive project/system files.
 */
export function sanitizeDocsPath(docsRoot: string, userPath: string): string | null {
  if (!docsRoot || typeof docsRoot !== "string") return null;
  if (!userPath || typeof userPath !== "string") return null;

  // Reject null byte injection or encoded traversal sequences
  if (userPath.includes("\0") || userPath.includes("..") || userPath.includes("%2F") || userPath.includes("%2f")) {
    return null;
  }

  // Normalize path and remove leading slashes
  const normalizedUserPath = path.normalize(userPath).replace(/^(\/|\\)+/, "");
  const normalizedDocsRoot = path.resolve(docsRoot);
  const resolvedTarget = path.resolve(normalizedDocsRoot, normalizedUserPath);

  // Strict containment check: resolved path must reside strictly inside docs root
  if (!resolvedTarget.startsWith(normalizedDocsRoot + path.sep)) {
    return null;
  }

  // Allowed file extensions: only markdown (.md) and gherkin feature (.feature)
  const ext = path.extname(resolvedTarget).toLowerCase();
  if (ext !== ".md" && ext !== ".feature") {
    return null;
  }

  return resolvedTarget;
}
