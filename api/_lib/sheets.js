/**
 * Google Sheets service — centralized initialization.
 * Uses a Service Account (JSON key) stored in env GOOGLE_SERVICE_ACCOUNT_JSON.
 */
import { google } from 'googleapis';

let sheetsClient = null;

const cache = new Map();
const TTL_MS = 15_000;

export async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON env variable');

  const credentials = JSON.parse(raw);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

export const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '';

export function invalidateSheet(tabName) {
  cache.delete(tabName);
}

function parseSheetRows(rawRows) {
  const rows = rawRows || [];
  if (rows.length <= 1) return [];
  return rows.slice(1);
}

async function fetchSheetFromGoogle(tabName) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: tabName,
  });
  return parseSheetRows(res.data.values);
}

function getCachedRows(tabName, fresh) {
  if (fresh) return null;
  const cached = cache.get(tabName);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.rows;
  }
  return null;
}

function setCachedRows(tabName, rows) {
  cache.set(tabName, { rows, expiresAt: Date.now() + TTL_MS });
}

/**
 * Reads all rows from a given sheet tab name.
 * Returns an array of row-arrays, skipping the header row.
 */
export async function readSheet(tabName, { fresh = false } = {}) {
  const cached = getCachedRows(tabName, fresh);
  if (cached) return cached;

  const rows = await fetchSheetFromGoogle(tabName);
  setCachedRows(tabName, rows);
  return rows;
}

/**
 * Reads multiple tabs in one batchGet call. Returns { [tabName]: rows[] }.
 */
export async function readSheetsBatch(tabNames, { fresh = false } = {}) {
  const result = {};
  const toFetch = [];

  for (const tabName of tabNames) {
    const cached = getCachedRows(tabName, fresh);
    if (cached) {
      result[tabName] = cached;
    } else {
      toFetch.push(tabName);
    }
  }

  if (toFetch.length > 0) {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SPREADSHEET_ID,
      ranges: toFetch,
    });

    const valueRanges = res.data.valueRanges || [];
    for (let i = 0; i < toFetch.length; i++) {
      const tabName = toFetch[i];
      const rows = parseSheetRows(valueRanges[i]?.values);
      setCachedRows(tabName, rows);
      result[tabName] = rows;
    }
  }

  return result;
}

/**
 * Appends a single row to the bottom of a sheet tab.
 */
export async function appendRow(tabName, values) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: tabName,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  });
  invalidateSheet(tabName);
}

/**
 * Updates a specific cell or range.
 */
export async function updateCell(tabName, range, values) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!${range}`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
  invalidateSheet(tabName);
}

/**
 * Finds a row index (1-based, data rows only, offset 1 for header) by matching
 * a value in a specific column (0-based). Returns the absolute row number (1-based
 * including header) or null.
 * Pass optional `rows` to avoid re-reading the tab.
 */
export async function findRow(tabName, colIndex, value, rows = null) {
  const data = rows ?? (await readSheet(tabName));
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][colIndex]).trim() === String(value).trim()) {
      return i + 2;
    }
  }
  return null;
}

/**
 * Updates a full row by finding it with a key column match.
 */
export async function updateRowByKey(tabName, keyColIndex, keyValue, newValues) {
  const rows = await readSheet(tabName);
  const rowNum = await findRow(tabName, keyColIndex, keyValue, rows);
  if (rowNum === null) throw new Error('Row not found');
  const range = `A${rowNum}`;
  await updateCell(tabName, range, [newValues]);
}

/**
 * Increments LeavePool (column G) for a user by the given amount.
 * Returns the new pool value.
 */
export async function incrementLeavePool(userId, amount = 1) {
  const rows = await readSheet("Users");
  const rowNum = await findRow("Users", 0, userId, rows);
  if (rowNum === null) throw new Error("User not found");

  const current = parseInt(rows[rowNum - 2][6], 10) || 0;
  const newPool = current + amount;
  await updateCell("Users", `G${rowNum}`, [[String(newPool)]]);
  return newPool;
}

/** Returns true if date string YYYY-MM-DD is a Sunday. */
export function isSunday(dateStr) {
  return new Date(`${dateStr}T12:00:00`).getDay() === 0;
}

/** Exposed for smoke tests — clears all cached tabs. */
export function clearSheetCache() {
  cache.clear();
}

/** Exposed for smoke tests — returns cache metadata without hitting Google. */
export function getSheetCacheEntry(tabName) {
  return cache.get(tabName) ?? null;
}

export function parseFresh(query) {
  return query?.fresh === "1" || query?.fresh === "true";
}
