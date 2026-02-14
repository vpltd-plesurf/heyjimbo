import JSZip from "jszip";
import initSqlJs, { type Database } from "sql.js";

// Apple epoch: 2001-01-01 00:00:00 UTC
const APPLE_EPOCH_OFFSET = 978307200;

export interface YojimboItem {
  name: string;
  type: string;
  content: string;
  is_flagged: boolean;
  is_trashed: boolean;
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
  label_name: string | null;
  // Type-specific fields
  url?: string;
  source_url?: string;
  location?: string;
  account?: string;
  password?: string;
  serial_number?: string;
  owner_name?: string;
  owner_email?: string;
  organization?: string;
  // Binary file data (images, PDFs)
  file_data?: string; // base64
  file_name?: string;
  content_type?: string;
}

export interface YojimboLabel {
  name: string;
  display_index: number;
}

export interface YojimboParseResult {
  items: YojimboItem[];
  labels: YojimboLabel[];
  summary: {
    total: number;
    imported: number;
    encrypted: number;
    byType: Record<string, number>;
  };
}

function convertTimestamp(appleTs: number | null): string {
  if (!appleTs) return new Date().toISOString();
  const unixMs = (appleTs + APPLE_EPOCH_OFFSET) * 1000;
  return new Date(unixMs).toISOString();
}

// Cocoa/NSKeyedArchiver metadata strings to filter out when scanning bplist
const COCOA_METADATA = new Set([
  "NSKeyedArchiver", "NSAttributedString", "NSMutableString",
  "NSParagraphStyle", "NSMutableParagraphStyle", "NSColorSpace",
  "NSDictionary", "NSMutableArray", "NSMutableData", "NSObject",
  "NSStrokeColor", "NSStrokeWidth", "NSUnderline", "NSFont",
  "NSColor", "NSBackgroundColor", "NSKern", "NSSuperScript",
  "NSTextAttachment", "NSFileWrapper", "NSMutableDictionary",
  "NSURL", "NSNumber",
  "$archiver", "$version", "$objects", "$top",
  "NS.string", "NS.keys", "NS.objects", "NSAttributes",
  "NS.bytes", "NS.data", "NS.base",
]);

// Patterns that indicate a string is Cocoa metadata, not user content
const METADATA_PATTERNS = [
  /^[\$%&'()*+,\-./0-9:;<=>?@A-Z\[\\\]^_`{|}~]+\[?NS/,
  /^\[?NS[A-Z][a-z]/,
  /^YNS[A-Z]/,
  /^[a-z]{0,3}YNS(Param|Row|Col|Table)/,
  /^VNS(Size|Font|Kern|Color|Link)/,
  /^WNS(Color|Table)/,
  /^XNS(fFlags|Param|RowNum|ColNum)/,
  /^YNS(Param|RowSpan|ColSpan)/,
  /^\]NS(StrokeColor|StrokeWidth|CatalogName)/,
  /^\\NS(ColorSpace|Descriptor|HasWidth)/,
  /^_NS(BackgroundColor|ParagraphStyle)/,
  /^\.IEC 61966/,
  /^X\$version/,
];

/**
 * Extract plain text content from a Yojimbo ZBYTES binary plist (NSKeyedArchiver).
 * Works in the browser without bplist-parser by scanning for printable text runs.
 */
function extractTextFromBplist(bytes: Uint8Array): string | null {
  if (bytes.length < 10) return null;

  // First byte is a type prefix: 0x01 = bplist data, 0x02 = UUID file reference
  const prefix = bytes[0];

  // 0x02 prefix = UUID reference to a file (PDF, image), no extractable text
  if (prefix === 0x02) return null;

  // Check for bplist magic after prefix
  const magic = String.fromCharCode(bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6]);
  if (magic !== "bplist") return null;

  // Scan for printable ASCII/UTF-8 string runs
  const candidates: string[] = [];
  let current = "";
  for (let i = 0; i < bytes.length; i++) {
    const ch = bytes[i];
    // Printable ASCII + common whitespace (tab, newline, CR)
    if ((ch >= 32 && ch < 127) || ch === 10 || ch === 13 || ch === 9) {
      current += String.fromCharCode(ch);
    } else {
      if (current.length > 5) {
        const trimmed = current.trim();
        if (trimmed.length > 5 && !isCocoaMetadata(trimmed)) {
          candidates.push(trimmed);
        }
      }
      current = "";
    }
  }
  if (current.length > 5) {
    const trimmed = current.trim();
    if (trimmed.length > 5 && !isCocoaMetadata(trimmed)) {
      candidates.push(trimmed);
    }
  }

  if (candidates.length === 0) return null;

  // Return the longest candidate (typically the actual note content)
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0];
}

function isCocoaMetadata(s: string): boolean {
  if (COCOA_METADATA.has(s)) return true;
  for (const pattern of METADATA_PATTERNS) {
    if (pattern.test(s)) return true;
  }
  return false;
}

// Z_ENT type mapping (based on actual Yojimbo data analysis)
// 17=ImageArchive, 18=Note, 19=PDFArchive, 20=WebArchive, 21=Password, 22=SerialNumber, 23=WebBookmark
function mapEntityType(zEnt: number, item: Record<string, unknown>): string {
  if (zEnt === 17) return "image";
  if (zEnt === 19) return "pdf";
  if (zEnt === 20) return "web_archive";
  if (item.ZURLSTRING) return "bookmark";
  if (item.ZSERIALNUMBER) return "serial_number";
  if (item.ZENCRYPTEDPASSWORD || (item.ZLOCATION && item.ZACCOUNT)) return "password";
  return "note";
}

function extractLabels(db: Database): YojimboLabel[] {
  const results = db.exec("SELECT ZNAME, ZDISPLAYINDEX FROM ZLABEL ORDER BY ZDISPLAYINDEX");
  if (results.length === 0) return [];

  return results[0].values.map((row) => ({
    name: row[0] as string,
    display_index: row[1] as number,
  }));
}

/**
 * Extract a UUID from a 0x02-prefixed ZBYTES blob.
 * The UUID is stored as a null-terminated ASCII string after the 0x02 prefix byte.
 * Format: 0x02 + "6AD254BE-37AD-47A2-8F68-C9050F50B132" + 0x00
 */
function extractUuidFromBlob(bytes: Uint8Array): string | null {
  if (bytes.length < 10 || bytes[0] !== 0x02) return null;

  // Read ASCII string after prefix byte, stop at null terminator
  let uuid = "";
  for (let i = 1; i < bytes.length; i++) {
    if (bytes[i] === 0x00) break;
    uuid += String.fromCharCode(bytes[i]);
  }

  // Validate it looks like a UUID
  if (/^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/.test(uuid)) {
    return uuid.toUpperCase();
  }
  return null;
}

/**
 * Build a map of UUID → ZIP file path for files in _EXTERNAL_DATA/.
 * Yojimbo stores files as UUID-named files (no extension) in _EXTERNAL_DATA/.
 */
function buildFileMap(zip: JSZip): Map<string, string> {
  const map = new Map<string, string>();
  zip.forEach((path, file) => {
    if (file.dir || path.includes("/._")) return;
    // Match UUID pattern in filename
    const segments = path.split("/");
    const fileName = segments[segments.length - 1];
    const uuidMatch = fileName.match(/^([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})$/);
    if (uuidMatch) {
      map.set(uuidMatch[1].toUpperCase(), path);
    }
  });
  return map;
}

/**
 * Detect file type from magic bytes.
 */
function detectFileType(bytes: Uint8Array): string {
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "pdf"; // %PDF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return "jpg"; // JPEG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return "png"; // PNG
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "gif"; // GIF
  if (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2A && bytes[3] === 0x00) return "tiff"; // TIFF LE
  if (bytes[0] === 0x4D && bytes[1] === 0x4D && bytes[2] === 0x00 && bytes[3] === 0x2A) return "tiff"; // TIFF BE
  if (bytes[0] === 0x42 && bytes[1] === 0x4D) return "bmp"; // BMP
  return "png"; // default to png for unknown image
}

/**
 * Convert Uint8Array to base64 in browser-compatible way.
 */
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function guessContentType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const types: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
    tiff: "image/tiff", tif: "image/tiff", bmp: "image/bmp",
    pdf: "application/pdf", webarchive: "application/x-webarchive",
  };
  return types[ext] || "application/octet-stream";
}

async function extractItems(db: Database, zip: JSZip): Promise<YojimboItem[]> {
  // Build label lookup
  const labelResults = db.exec("SELECT Z_PK, ZNAME FROM ZLABEL");
  const labelMap = new Map<number, string>();
  if (labelResults.length > 0) {
    for (const row of labelResults[0].values) {
      labelMap.set(row[0] as number, row[1] as string);
    }
  }

  // Get all items with their blob string reps AND raw bytes for fallback
  const itemResults = db.exec(`
    SELECT
      i.Z_PK, i.Z_ENT, i.ZNAME, i.ZENCRYPTED, i.ZFLAGGED, i.ZINTRASH,
      i.ZLABEL, i.ZDATECREATED, i.ZDATEMODIFIED,
      i.ZURLSTRING, i.ZSOURCEURLSTRING,
      i.ZLOCATION, i.ZACCOUNT,
      i.ZSERIALNUMBER, i.ZOWNERNAME, i.ZOWNEREMAIL, i.ZORGANIZATION,
      bs.ZSTRING,
      b.ZBYTES
    FROM ZITEM i
    LEFT JOIN ZBLOB b ON i.ZBLOB = b.Z_PK
    LEFT JOIN ZBLOBSTRINGREP bs ON bs.ZBLOB = b.Z_PK
    ORDER BY i.ZDATEMODIFIED DESC
  `);

  if (itemResults.length === 0) return [];

  const fileMap = buildFileMap(zip);

  const items: YojimboItem[] = [];
  for (const row of itemResults[0].values) {
    const zEnt = row[1] as number;
    const encrypted = (row[3] as number) === 1;
    const itemData: Record<string, unknown> = {
      ZURLSTRING: row[9],
      ZSOURCEURLSTRING: row[10],
      ZLOCATION: row[11],
      ZACCOUNT: row[12],
      ZSERIALNUMBER: row[13],
    };

    let type = mapEntityType(zEnt, itemData);
    const labelPk = row[6] as number | null;
    const itemName = (row[2] as string) || "Untitled";

    // Try ZBLOBSTRINGREP first, fall back to extracting from ZBYTES bplist
    let content = "";
    let file_data: string | undefined;
    let file_name: string | undefined;
    let content_type: string | undefined;

    if (!encrypted) {
      const rawBytes = row[18] as Uint8Array | null;

      // Check for file reference (0x02 prefix = UUID pointing to _EXTERNAL_DATA/)
      // This can happen for ANY Z_ENT type — notes with images, PDFs, etc.
      if (rawBytes && rawBytes[0] === 0x02) {
        const uuid = extractUuidFromBlob(rawBytes);
        if (uuid) {
          const zipPath = fileMap.get(uuid);
          if (zipPath) {
            const zipFile = zip.file(zipPath);
            if (zipFile) {
              const fileBytes = await zipFile.async("uint8array");
              file_data = uint8ToBase64(fileBytes);

              // Detect actual file type from magic bytes
              const detectedType = detectFileType(fileBytes);
              if (detectedType === "pdf") {
                type = "pdf";
                file_name = `${itemName}.pdf`;
                content_type = "application/pdf";
              } else {
                type = "image";
                file_name = `${itemName}.${detectedType}`;
                content_type = guessContentType(file_name);
              }
            }
          }
        }
      } else if (type === "web_archive") {
        // Web archives: extract any text, treat as note
        const stringRep = row[17] as string | null;
        if (stringRep) {
          content = stringRep;
        } else if (rawBytes) {
          content = extractTextFromBplist(rawBytes) || "";
        }
      } else {
        // Text-based types
        const stringRep = row[17] as string | null;
        if (stringRep) {
          content = stringRep;
        } else if (rawBytes) {
          content = extractTextFromBplist(rawBytes) || "";
        }
      }
    }

    items.push({
      name: itemName,
      type: type === "web_archive" ? "note" : type, // web archives become notes
      content,
      is_flagged: (row[4] as number) === 1,
      is_trashed: (row[5] as number) === 1,
      is_encrypted: encrypted,
      created_at: convertTimestamp(row[7] as number | null),
      updated_at: convertTimestamp(row[8] as number | null),
      label_name: labelPk ? (labelMap.get(labelPk) || null) : null,
      // Type-specific fields
      url: (row[9] as string) || undefined,
      source_url: (row[10] as string) || undefined,
      location: (row[11] as string) || undefined,
      account: (row[12] as string) || undefined,
      serial_number: (row[13] as string) || undefined,
      owner_name: (row[14] as string) || undefined,
      owner_email: (row[15] as string) || undefined,
      organization: (row[16] as string) || undefined,
      file_data,
      file_name,
      content_type,
    });
  }
  return items;
}

export async function parseYojimboZip(buffer: ArrayBuffer): Promise<YojimboParseResult> {
  const zip = await JSZip.loadAsync(buffer);

  // Find the Database.sqlite file inside the ZIP
  let dbFile: JSZip.JSZipObject | null = null;
  zip.forEach((relativePath, file) => {
    if (relativePath.endsWith("Database.sqlite") && !file.dir && !relativePath.includes("/._")) {
      dbFile = file;
    }
  });

  if (!dbFile) {
    throw new Error("Database.sqlite not found in the ZIP archive");
  }

  const dbBuffer = await (dbFile as JSZip.JSZipObject).async("arraybuffer");

  // Initialize sql.js — serve WASM from public/ for browser
  const SQL = await initSqlJs({
    locateFile: (file: string) => `/${file}`,
  });
  const db = new SQL.Database(new Uint8Array(dbBuffer));

  try {
    const labels = extractLabels(db);
    const allItems = await extractItems(db, zip);

    const encrypted = allItems.filter((i) => i.is_encrypted);
    const importable = allItems.filter((i) => !i.is_encrypted);

    const byType: Record<string, number> = {};
    for (const item of importable) {
      byType[item.type] = (byType[item.type] || 0) + 1;
    }

    return {
      items: importable,
      labels,
      summary: {
        total: allItems.length,
        imported: importable.length,
        encrypted: encrypted.length,
        byType,
      },
    };
  } finally {
    db.close();
  }
}
