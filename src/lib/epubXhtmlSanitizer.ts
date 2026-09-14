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
 * Pure function: Sanitizes undeclared HTML entities in an XHTML / XML string,
 * replacing them with their Unicode equivalents while preserving standard XML entities.
 */
export function sanitizeEpubXhtml(input: string): string {
  if (!input || typeof input !== "string") return input;

  return input.replace(/&([a-zA-Z0-9]+|#[0-9]+|#x[0-9a-fA-F]+);/g, (match, entityName) => {
    // 1. Numeric character references (e.g. &#160; or &#x1F600;) are standard in XML
    if (entityName.startsWith("#")) {
      return match;
    }

    // 2. Predefined XML entities (&amp;, &lt;, &gt;, &quot;, &apos;) are valid in XML
    if (XML_ENTITIES.has(entityName)) {
      return match;
    }

    // 3. Known named HTML entities mapped to Unicode characters
    if (HTML_ENTITY_MAP[entityName] !== undefined) {
      return HTML_ENTITY_MAP[entityName];
    }

    // 4. Unknown entity: keep as-is safely
    return match;
  });
}

/**
 * Asynchronously inspects and sanitizes all XHTML, HTML, XML, OPF, and NCX entries
 * within an in-memory EPUB zip archive before feeding it to epubjs.
 * Leaves the original file on disk completely untouched.
 */
export async function sanitizeEpubArchive(input: ArrayBuffer | Uint8Array): Promise<ArrayBuffer> {
  try {
    const zip = await JSZip.loadAsync(input);
    let hasModifications = false;

    const targetFiles: { path: string; file: JSZip.JSZipObject }[] = [];
    zip.forEach((relativePath, file) => {
      if (!file.dir && /\.(xhtml|html|htm|xml|opf|ncx)$/i.test(relativePath)) {
        targetFiles.push({ path: relativePath, file });
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
      return await zip.generateAsync({
        type: "arraybuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });
    }

    return input instanceof ArrayBuffer ? input : input.buffer;
  } catch (error) {
    console.warn("[epubXhtmlSanitizer] Failed to sanitize zip archive, falling back to original:", error);
    return input instanceof ArrayBuffer ? input : input.buffer;
  }
}
