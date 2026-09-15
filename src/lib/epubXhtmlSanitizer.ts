import JSZip from "jszip";

/**
 * Comprehensive standard HTML named entity mappings to their unicode representation
 * to prevent XML DOMParser failures in XHTML / EPUB documents.
 */
export const HTML_ENTITY_MAP: Record<string, string> = {
  // Common typographic & punctuation entities
  nbsp: "\u00A0", // non-breaking space
  iexcl: "¡",
  cent: "¢",
  pound: "£",
  curren: "¤",
  yen: "¥",
  brvbar: "¦",
  sect: "§",
  uml: "¨",
  copy: "©",
  ordf: "ª",
  laquo: "«",
  not: "¬",
  shy: "\u00AD",
  reg: "®",
  macr: "¯",
  deg: "°",
  plusmn: "±",
  sup2: "²",
  sup3: "³",
  acute: "´",
  micro: "µ",
  para: "¶",
  middot: "·",
  cedil: "¸",
  sup1: "¹",
  ordm: "º",
  raquo: "»",
  frac14: "¼",
  frac12: "½",
  frac34: "¾",
  iquest: "¿",
  times: "\u00D7", // ×
  divide: "\u00F7", // ÷

  // Quotation & dashes
  ndash: "\u2013", // –
  mdash: "\u2014", // —
  lsquo: "\u2018", // ‘
  rsquo: "\u2019", // ’
  sbquo: "\u201A", // ‚
  ldquo: "\u201C", // “
  rdquo: "\u201D", // ”
  bdquo: "\u201E", // „
  dagger: "†",
  Dagger: "‡",
  bull: "\u2022", // •
  hellip: "\u2026", // …
  permil: "‰",
  prime: "′",
  Prime: "″",
  lsaquo: "‹",
  rsaquo: "›",
  oline: "‾",
  euro: "€",
  trade: "™",

  // Mathematical & arrows
  larr: "←",
  uarr: "↑",
  rarr: "→",
  darr: "↓",
  harr: "↔",
  crarr: "↵",
  part: "∂",
  exist: "∃",
  empty: "∅",
  nabla: "∇",
  isin: "∈",
  notin: "∉",
  ni: "∋",
  prod: "∏",
  sum: "∑",
  minus: "−",
  radic: "√",
  prop: "∝",
  infin: "∞",
  ang: "∠",
  and: "∧",
  or: "∨",
  cap: "∩",
  cup: "∪",
  int: "∫",
  there4: "∴",
  sim: "∼",
  cong: "≅",
  asymp: "≈",
  ne: "≠",
  equiv: "≡",
  le: "≤",
  ge: "≥",
  sub: "⊂",
  sup: "⊃",
  nsub: "⊄",
  sube: "⊆",
  supe: "⊇",
  oplus: "⊕",
  otimes: "⊗",
  perp: "⊥",
  sdot: "⋅",

  // Latin characters
  Agrave: "À", Aacute: "Á", Acirc: "Â", Atilde: "Ã", Auml: "Ä", Aring: "Å", AElig: "Æ",
  Ccedil: "Ç", Egrave: "È", Eacute: "É", Ecirc: "Ê", Euml: "Ë", Igrave: "Ì", Iacute: "Í",
  Icirc: "Î", Iuml: "Ï", ETH: "Ð", Ntilde: "Ñ", Ograve: "Ò", Oacute: "Ó", Ocirc: "Ô",
  Otilde: "Õ", Ouml: "Ö", Oslash: "Ø", Ugrave: "Ù", Uacute: "Ú", Ucirc: "Û", Uuml: "Ü",
  Yacute: "Ý", THORN: "Þ", szlig: "ß",
  agrave: "à", aacute: "á", acirc: "â", atilde: "ã", auml: "ä", aring: "å", aelig: "æ",
  ccedil: "ç", egrave: "è", eacute: "é", ecirc: "ê", euml: "ë", igrave: "ì", iacute: "í",
  icirc: "î", iuml: "ï", eth: "ð", ntilde: "ñ", ograve: "ò", oacute: "ó", ocirc: "ô",
  otilde: "õ", ouml: "ö", oslash: "ø", ugrave: "ù", uacute: "ú", ucirc: "û", uuml: "ü",
  yacute: "ý", thorn: "þ", yuml: "ÿ",

  // Greek characters
  Alpha: "Α", Beta: "Β", Gamma: "Γ", Delta: "Δ", Epsilon: "Ε", Zeta: "Ζ", Eta: "Η", Theta: "Θ",
  Iota: "Ι", Kappa: "Κ", Lambda: "Λ", Mu: "Μ", Nu: "Ν", Xi: "Ξ", Omicron: "Ο", Pi: "Π",
  Rho: "Ρ", Sigma: "Σ", Tau: "Τ", Upsilon: "Υ", Phi: "Φ", Chi: "Χ", Psi: "Ψ", Omega: "Ω",
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", zeta: "ζ", eta: "η", theta: "θ",
  iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", omicron: "ο", pi: "π",
  rho: "ρ", sigmaf: "ς", sigma: "σ", tau: "τ", upsilon: "υ", phi: "φ", chi: "χ", psi: "ψ", omega: "ω"
};

// Valid XML predefined entities that must remain as entities in XML
const XML_ENTITIES = new Set(["amp", "lt", "gt", "quot", "apos"]);

/**
 * Generates a unique, non-deterministic prefix per invocation to prevent
 * placeholder collision with arbitrary EPUB text content.
 */
function createProtectedBlockPrefix(): string {
  const randomPart =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;

  return `__KOS_XML_PROTECTED_${randomPart}_`;
}

/**
 * Pure function: Sanitizes undeclared HTML entities and bare ampersands in an XHTML / XML string.
 *
 * Pipeline:
 * 1. Protect CDATA blocks (<![CDATA[...]]>) and XML comments (<!--...-->) with unique invocation-scoped placeholders.
 * 2. Convert named HTML entities to Unicode equivalents, keeping standard XML entities (&amp;, &lt;, &gt;, &quot;, &apos;) and numeric entities (&#...;).
 * 3. Escape all remaining bare/invalid ampersands to &amp; using negative lookahead (never double-escaping &amp;).
 * 4. Restore protected CDATA and comment blocks using specific prefix matching.
 */
export function sanitizeEpubXhtml(input: string): string {
  if (!input || typeof input !== "string") return input;

  const prefix = createProtectedBlockPrefix();
  const placeholders: string[] = [];

  // Step 1: Protect CDATA sections and comments from being modified
  const protectedStr = input.replace(
    /(<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->)/g,
    (match) => {
      const token = `${prefix}${placeholders.length}__`;
      placeholders.push(match);
      return token;
    }
  );

  // Step 2: Normalize known named HTML entities into Unicode, keeping XML entities & numeric references
  const normalizedEntities = protectedStr.replace(
    /&([a-zA-Z0-9]+|#[0-9]+|#x[0-9a-fA-F]+);/g,
    (match, entityName) => {
      // Numeric references: &#123; or &#x7B;
      if (entityName.startsWith("#")) {
        return match;
      }

      // Predefined XML entities: &amp;, &lt;, &gt;, &quot;, &apos;
      if (XML_ENTITIES.has(entityName)) {
        return match;
      }

      // Named HTML entities from mapping
      if (HTML_ENTITY_MAP[entityName] !== undefined) {
        return HTML_ENTITY_MAP[entityName];
      }

      // Unknown named entity: leave to Step 3 to escape safely as &amp;entityName;
      return match;
    }
  );

  // Step 3: Escape any remaining bare or undeclared ampersands that are not valid XML entities
  // Valid entities after Step 2 are ONLY: &amp;, &lt;, &gt;, &quot;, &apos;, and &#...;
  const escapedAmpersands = normalizedEntities.replace(
    /&(?!(?:amp|lt|gt|quot|apos);|#(?:[0-9]+|x[0-9a-fA-F]+);)/g,
    "&amp;"
  );

  // Step 4: Escape bare or invalid less-than characters that do not begin valid XML tags
  const escapedLessThan = escapedAmpersands.replace(
    /<(?![a-zA-Z_:\/?!])/g,
    "&lt;"
  );

  // Step 5: Restore protected CDATA and comment blocks using specific prefix matching
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const restorePattern = new RegExp(`${escapedPrefix}(\\d+)__`, "g");
  return escapedLessThan.replace(restorePattern, (_, idxStr) => {
    const idx = Number(idxStr);
    return placeholders[idx] !== undefined ? placeholders[idx] : "";
  });
}

export interface EpubArchiveSanitizationResult {
  buffer: ArrayBuffer;
  sanitizedEntries: string[];
  skippedEntries: string[];
}

/**
 * Asynchronously inspects and sanitizes only XHTML/HTML content entries (.xhtml, .html, .htm)
 * within an in-memory EPUB zip archive before feeding it to epubjs.
 *
 * Intentionally skips and preserves raw bytes for:
 * - Stylesheets (.css)
 * - Scripts (.js)
 * - Images (.png, .jpg, .jpeg, .webp, .gif)
 * - Vector graphics (.svg)
 * - Package and navigation documents (.opf, .ncx)
 * - Container manifest (META-INF/container.xml)
 * - Fonts and media assets
 *
 * Leaves the original file on disk completely untouched.
 */
export async function sanitizeEpubArchiveWithReport(
  input: ArrayBuffer | Uint8Array
): Promise<EpubArchiveSanitizationResult> {
  const sanitizedEntries: string[] = [];
  const skippedEntries: string[] = [];

  try {
    const zip = await JSZip.loadAsync(input);
    let hasModifications = false;

    const targetFiles: { path: string; file: JSZip.JSZipObject }[] = [];
    zip.forEach((relativePath, file) => {
      if (file.dir) return;

      // Only target XHTML and HTML document entries
      if (/\.(xhtml|html|htm)$/i.test(relativePath)) {
        targetFiles.push({ path: relativePath, file });
        sanitizedEntries.push(relativePath);
      } else {
        skippedEntries.push(relativePath);
      }
    });

    for (const { path, file } of targetFiles) {
      const rawText = await file.async("text");
      const sanitized = sanitizeEpubXhtml(rawText);
      if (sanitized !== rawText) {
        zip.file(path, sanitized);
        hasModifications = true;
      }
    }

    if (hasModifications) {
      const buffer = await zip.generateAsync({
        type: "arraybuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });
      return { buffer, sanitizedEntries, skippedEntries };
    }

    const buffer = input instanceof ArrayBuffer ? input : input.buffer;
    return { buffer, sanitizedEntries, skippedEntries };
  } catch (error) {
    console.warn("[epubXhtmlSanitizer] Failed to sanitize zip archive, falling back to original:", error);
    const buffer = input instanceof ArrayBuffer ? input : input.buffer;
    return { buffer, sanitizedEntries, skippedEntries };
  }
}

/**
 * Primary entry point: Asynchronously sanitizes XHTML entries in EPUB zip archive,
 * returning sanitized ArrayBuffer.
 */
export async function sanitizeEpubArchive(input: ArrayBuffer | Uint8Array): Promise<ArrayBuffer> {
  const result = await sanitizeEpubArchiveWithReport(input);
  return result.buffer;
}
