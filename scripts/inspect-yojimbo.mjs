#!/usr/bin/env node
// Diagnostic script to inspect a Yojimbo ZIP and understand file references
import fs from "fs";
import JSZip from "jszip";
import initSqlJs from "sql.js";

const zipPath = process.argv[2];
if (!zipPath) {
  console.error("Usage: node scripts/inspect-yojimbo.mjs <path-to-yojimbo.zip>");
  process.exit(1);
}

const buffer = fs.readFileSync(zipPath);
const zip = await JSZip.loadAsync(buffer);

// 1. List ALL files in ZIP
console.log("=== ALL FILES IN ZIP ===");
const allPaths = [];
zip.forEach((path, file) => {
  if (!file.dir && !path.includes("/._")) {
    const size = file._data?.uncompressedSize || "?";
    allPaths.push(path);
    console.log(`  ${path} (${size} bytes)`);
  }
});

// 2. Find and open Database.sqlite
let dbFile = null;
zip.forEach((path, file) => {
  if (path.endsWith("Database.sqlite") && !file.dir && !path.includes("/._")) {
    dbFile = file;
  }
});

if (!dbFile) {
  console.error("Database.sqlite not found!");
  process.exit(1);
}

const dbBuffer = await dbFile.async("arraybuffer");
const SQL = await initSqlJs();
const db = new SQL.Database(new Uint8Array(dbBuffer));

// 3. Show all items with Z_ENT and ZBYTES info
console.log("\n=== ALL ITEMS ===");
const items = db.exec(`
  SELECT i.Z_PK, i.Z_ENT, i.ZNAME, i.ZENCRYPTED,
         i.ZURLSTRING, i.ZLOCATION, i.ZACCOUNT, i.ZSERIALNUMBER,
         b.Z_PK as BLOB_PK,
         length(b.ZBYTES) as BYTES_LEN,
         bs.ZSTRING
  FROM ZITEM i
  LEFT JOIN ZBLOB b ON i.ZBLOB = b.Z_PK
  LEFT JOIN ZBLOBSTRINGREP bs ON bs.ZBLOB = b.Z_PK
  ORDER BY i.ZNAME
`);

if (items.length > 0) {
  const entTypes = { 17: "Image", 18: "Note", 19: "PDF", 20: "WebArchive", 21: "Password", 22: "Serial", 23: "Bookmark" };
  for (const row of items[0].values) {
    const [zpk, zent, name, encrypted, url, loc, acct, serial, blobPk, bytesLen, stringRep] = row;
    const typeName = entTypes[zent] || `Unknown(${zent})`;
    const hasString = stringRep ? `string:${stringRep.length}chars` : "no-string";
    console.log(`  [${zpk}] Z_ENT=${zent}(${typeName}) "${name}" enc=${encrypted} blob=${blobPk} bytes=${bytesLen} ${hasString}`);
  }
}

// 4. Show ZBYTES first bytes for all blobs
console.log("\n=== BLOB FIRST BYTES (for file reference detection) ===");
const blobs = db.exec(`
  SELECT b.Z_PK, length(b.ZBYTES), substr(b.ZBYTES, 1, 20) as HEAD,
         i.ZNAME, i.Z_ENT
  FROM ZBLOB b
  LEFT JOIN ZITEM i ON i.ZBLOB = b.Z_PK
  ORDER BY i.Z_ENT, i.ZNAME
`);

if (blobs.length > 0) {
  for (const row of blobs[0].values) {
    const [bpk, blen, head, name, zent] = row;
    if (head) {
      const bytes = head instanceof Uint8Array ? head : new Uint8Array(typeof head === 'string' ? [...head].map(c => c.charCodeAt(0)) : []);
      const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join(" ");
      const prefix = bytes[0];
      let prefixType = "unknown";
      if (prefix === 0x01) prefixType = "bplist-data";
      if (prefix === 0x02) prefixType = "FILE-REF";
      console.log(`  blob=${bpk} ent=${zent} "${name}" len=${blen} prefix=0x${prefix?.toString(16)}(${prefixType}) hex=[${hex}]`);

      // If 0x02, try to extract UUID
      if (prefix === 0x02 && bytes.length >= 17) {
        const uuidHex = Array.from(bytes.slice(1, 17)).map(b => b.toString(16).padStart(2, "0")).join("");
        const uuid = `${uuidHex.slice(0,8)}-${uuidHex.slice(8,12)}-${uuidHex.slice(12,16)}-${uuidHex.slice(16,20)}-${uuidHex.slice(20)}`.toUpperCase();
        console.log(`    → UUID: ${uuid}`);

        // Check if this UUID matches any file in ZIP
        const matchingFiles = allPaths.filter(p => p.toUpperCase().includes(uuidHex.toUpperCase().slice(0, 8)));
        if (matchingFiles.length > 0) {
          console.log(`    → Matching ZIP files: ${matchingFiles.join(", ")}`);
        } else {
          console.log(`    → NO matching files found in ZIP for this UUID`);
        }
      }
    }
  }
}

// 5. Specifically look for "Nintendo Password"
console.log("\n=== LOOKING FOR 'Nintendo Password' ===");
const nintendo = db.exec(`
  SELECT i.*, b.Z_PK as BLOB_PK, length(b.ZBYTES) as BLEN
  FROM ZITEM i
  LEFT JOIN ZBLOB b ON i.ZBLOB = b.Z_PK
  WHERE i.ZNAME LIKE '%Nintendo%'
`);
if (nintendo.length > 0) {
  console.log("Columns:", nintendo[0].columns.join(", "));
  for (const row of nintendo[0].values) {
    console.log("Values:", row);
  }

  // Get raw ZBYTES for this item
  const rawBlob = db.exec(`
    SELECT b.ZBYTES
    FROM ZITEM i
    JOIN ZBLOB b ON i.ZBLOB = b.Z_PK
    WHERE i.ZNAME LIKE '%Nintendo%'
  `);
  if (rawBlob.length > 0 && rawBlob[0].values[0][0]) {
    const bytes = rawBlob[0].values[0][0];
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(typeof bytes === 'string' ? [...bytes].map(c => c.charCodeAt(0)) : []);
    console.log(`\nZBYTES first 50 bytes: ${Array.from(arr.slice(0, 50)).map(b => b.toString(16).padStart(2, "0")).join(" ")}`);
    console.log(`ZBYTES as text: ${Array.from(arr.slice(0, 100)).map(b => b >= 32 && b < 127 ? String.fromCharCode(b) : '.').join("")}`);
  }
}

// 6. Show _EXTERNAL_DATA structure specifically
console.log("\n=== _EXTERNAL_DATA FILES ===");
zip.forEach((path, file) => {
  if ((path.includes("EXTERNAL") || path.includes("external") || path.includes("Resources")) && !file.dir && !path.includes("/._")) {
    console.log(`  ${path}`);
  }
});

db.close();
console.log("\nDone.");
