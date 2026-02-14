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

// Z_ENT type mapping (based on actual Yojimbo data analysis)
// All items in the sample DB are Z_ENT=18 (notes), but Yojimbo supports other types
function mapEntityType(zEnt: number, item: Record<string, unknown>): string {
  // Check for type-specific fields to determine actual type
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

function extractItems(db: Database): YojimboItem[] {
  // Build label lookup
  const labelResults = db.exec("SELECT Z_PK, ZNAME FROM ZLABEL");
  const labelMap = new Map<number, string>();
  if (labelResults.length > 0) {
    for (const row of labelResults[0].values) {
      labelMap.set(row[0] as number, row[1] as string);
    }
  }

  // Get all items with their blob string reps for plaintext content
  const itemResults = db.exec(`
    SELECT
      i.Z_PK, i.Z_ENT, i.ZNAME, i.ZENCRYPTED, i.ZFLAGGED, i.ZINTRASH,
      i.ZLABEL, i.ZDATECREATED, i.ZDATEMODIFIED,
      i.ZURLSTRING, i.ZSOURCEURLSTRING,
      i.ZLOCATION, i.ZACCOUNT,
      i.ZSERIALNUMBER, i.ZOWNERNAME, i.ZOWNEREMAIL, i.ZORGANIZATION,
      bs.ZSTRING
    FROM ZITEM i
    LEFT JOIN ZBLOB b ON i.ZBLOB = b.Z_PK
    LEFT JOIN ZBLOBSTRINGREP bs ON bs.ZBLOB = b.Z_PK
    ORDER BY i.ZDATEMODIFIED DESC
  `);

  if (itemResults.length === 0) return [];

  return itemResults[0].values.map((row) => {
    const zEnt = row[1] as number;
    const encrypted = (row[3] as number) === 1;
    const itemData: Record<string, unknown> = {
      ZURLSTRING: row[9],
      ZSOURCEURLSTRING: row[10],
      ZLOCATION: row[11],
      ZACCOUNT: row[12],
      ZSERIALNUMBER: row[13],
    };

    const type = mapEntityType(zEnt, itemData);
    const labelPk = row[6] as number | null;

    return {
      name: (row[2] as string) || "Untitled",
      type,
      content: encrypted ? "" : ((row[17] as string) || ""),
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
    };
  });
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
    const allItems = extractItems(db);

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
