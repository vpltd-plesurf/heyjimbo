#!/usr/bin/env node
// Test the parser logic against the real ZIP
import fs from "fs";
import JSZip from "jszip";
import initSqlJs from "sql.js";

const zipPath = process.argv[2] || "Yojimbo 2026-02-14.zip";
const buffer = fs.readFileSync(zipPath);
const zip = await JSZip.loadAsync(buffer);

// Build file map (same logic as parser)
const fileMap = new Map();
zip.forEach((path, file) => {
  if (file.dir || path.includes("/._")) return;
  const segments = path.split("/");
  const fileName = segments[segments.length - 1];
  const uuidMatch = fileName.match(/^([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})$/);
  if (uuidMatch) {
    fileMap.set(uuidMatch[1].toUpperCase(), path);
  }
});

console.log(`=== FILE MAP (${fileMap.size} UUID files) ===`);
for (const [uuid, path] of fileMap) {
  console.log(`  ${uuid} → ${path}`);
}

// Open DB
let dbFile = null;
zip.forEach((path, file) => {
  if (path.endsWith("Database.sqlite") && !file.dir && !path.includes("/._")) {
    dbFile = file;
  }
});
const dbBuffer = await dbFile.async("arraybuffer");
const SQL = await initSqlJs();
const db = new SQL.Database(new Uint8Array(dbBuffer));

// Check all 0x02 prefix items
console.log("\n=== FILE REFERENCE ITEMS ===");
const results = db.exec(`
  SELECT i.ZNAME, i.Z_ENT, b.ZBYTES
  FROM ZITEM i
  JOIN ZBLOB b ON i.ZBLOB = b.Z_PK
  WHERE length(b.ZBYTES) < 50
  ORDER BY i.ZNAME
`);

if (results.length > 0) {
  for (const row of results[0].values) {
    const name = row[0];
    const zent = row[1];
    const bytes = row[2];

    if (!bytes) continue;
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(typeof bytes === 'string' ? [...bytes].map(c => c.charCodeAt(0)) : []);

    if (arr[0] !== 0x02) continue;

    // Extract UUID as ASCII
    let uuid = "";
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] === 0x00) break;
      uuid += String.fromCharCode(arr[i]);
    }

    const isValidUuid = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/.test(uuid);
    const zipPath = fileMap.get(uuid.toUpperCase());

    console.log(`  "${name}" Z_ENT=${zent}`);
    console.log(`    UUID: ${uuid} (valid: ${isValidUuid})`);
    console.log(`    ZIP path: ${zipPath || "NOT FOUND"}`);

    if (zipPath) {
      const file = zip.file(zipPath);
      if (file) {
        const fileBytes = await file.async("uint8array");
        const magic = Array.from(fileBytes.slice(0, 4)).map(b => b.toString(16).padStart(2, "0")).join(" ");
        console.log(`    File size: ${fileBytes.length} bytes, magic: ${magic}`);
      } else {
        console.log(`    zip.file() returned null!`);
      }
    }
    console.log();
  }
}

db.close();
