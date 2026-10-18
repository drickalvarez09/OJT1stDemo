// sheets.js
//
// Pulls two tabs from the shared Google Sheet:
//   - "Funds"    -> main dashboard (summary cards, program/expense charts,
//                   unobligated balances, the detail table)
//   - "Per UACS" -> "Per UACS View" (allocation/obligation/unobligated
//                   broken down by UACS object code)
//
// Columns are looked up by header name (see the alias maps below) rather
// than hardcoded position, so if a column gets reordered or renamed on the
// sheet, this keeps working instead of silently reading the wrong field.

const SHEET_ID = "1AU4EuE11IqJa-RJe-CMpEZcKo8WRnQBC4JAadGUh57I";

function buildSheetUrl(sheetName) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
}

async function fetchTab(sheetName) {
  const url = buildSheetUrl(sheetName);
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
    const text = await res.text();
    const json = JSON.parse(text.substring(47).slice(0, -2));

    if (!json.table) throw new Error("Invalid or empty sheet format");

    // Google's gviz endpoint normally detects the header row itself and
    // reports it via table.cols[i].label, WITHOUT including it in
    // table.rows. Relying on rows[0] being the header (as this used to)
    // breaks as soon as gviz does that — this is the bug that made every
    // column show up as "could not find". table.cols is the reliable
    // source; falling back to rows[0] only covers the rare case where
    // gviz didn't detect headers and left cols unlabeled.
    const colLabels = (json.table.cols || []).map((c) => String(c.label ?? "").trim());

    const rows = (json.table.rows || []).map((r) =>
      r.c.map((c) => ({
        v: c?.v ?? "",
        f: c?.f ?? c?.v ?? "",
      }))
    );

    return { colLabels, rows };
  } catch (err) {
    console.error(`Failed to load "${sheetName}" tab:`, err);
    alert(`⚠️ Failed to fetch "${sheetName}" data from Google Sheets. Check that the tab exists and is named exactly "${sheetName}".`);
    return { colLabels: [], rows: [] };
  }
}

// Picks the effective header row + data rows, preferring gviz's own
// column labels over guessing from row content.
function resolveHeaderAndData(colLabels, rows) {
  if (colLabels.some((l) => l !== "")) {
    return { headerRow: colLabels.map((l) => ({ v: l, f: l })), dataRows: rows };
  }
  if (rows.length && isLikelyHeaderRow(rows[0])) {
    return { headerRow: rows[0], dataRows: rows.slice(1) };
  }
  return { headerRow: [], dataRows: rows };
}

// --- Column lookup by header name -----------------------------------
// `aliases` maps each logical field name to one or more header strings
// that might appear on the sheet (checked as an exact match first, then
// as a substring match). Returns -1 for a field if no header matched.
function mapColumnsByHeader(headerRow, aliases) {
  const headers = headerRow.map((c) => String(c.f ?? c.v ?? "").trim().toLowerCase());
  const index = {};

  for (const [field, rawAliases] of Object.entries(aliases)) {
    const candidates = (Array.isArray(rawAliases) ? rawAliases : [rawAliases]).map((a) => a.toLowerCase());
    let found = -1;
    for (const candidate of candidates) {
      found = headers.indexOf(candidate);
      if (found !== -1) break;
    }
    if (found === -1) {
      for (const candidate of candidates) {
        found = headers.findIndex((h) => h.includes(candidate));
        if (found !== -1) break;
      }
    }
    index[field] = found;
  }
  return index;
}

function isLikelyHeaderRow(row) {
  return row.length > 0 && row.every((c) => isNaN(Number(c.v)) && c.f !== "");
}

const parseCurrency = (value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[₱,]/g, "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

// Prefer gviz's formatted text when it carries a percent sign, since gviz
// reports percent-formatted cells as a 0-1 fraction in `v`.
const parseBurCell = (cell) => {
  if (!cell) return 0;
  const raw = typeof cell.f === "string" && cell.f.includes("%") ? cell.f : cell.v;
  return parsePercentage(raw);
};

document.addEventListener("DOMContentLoaded", async function () {
  replaceIcons();

  // ------------------------------------------------------------------
  // "Funds" tab -> main dashboard
  // ------------------------------------------------------------------
  const { colLabels: fundsColLabels, rows: fundsRawRows } = await fetchTab("Funds");
  if (!fundsRawRows.length) {
    console.error("No data returned from the Funds tab");
    return;
  }

  const { headerRow, dataRows: fundsDataRows } = resolveHeaderAndData(fundsColLabels, fundsRawRows);
  let dataRows = fundsDataRows.filter((r) => r.some((c) => c.v !== "" && c.v !== 0));

  // The "Funds" tab has no separate "Program" or "Particular Description"
  // columns like the old sheet did, so those reuse Component Program /
  // Specific Activity respectively.
  const COL = mapColumnsByHeader(headerRow, {
    COMPONENT_PROGRAM: ["Component Program"],
    PROGRAM: ["Component Program"],
    ACTIVITY: ["Activity"],
    PARTICULAR_DESC: ["Specific Activity"],
    SUBARO: ["Sub-ARO No.", "Sub-ARO"],
    ALLOC: ["Total Allocation per Sub-ARO", "Allocation"],
    OBLIG: ["Obligation"],
    BUR: ["BUR"],
    UNOBLIG_BAL: ["Unobligated Balances"],
  });

  const missingCols = Object.entries(COL).filter(([, idx]) => idx === -1).map(([field]) => field);
  if (missingCols.length) {
    console.warn("Funds tab: could not find a column for:", missingCols.join(", "));
  }

  // Clean numeric columns
  dataRows = dataRows.map((row) => {
    const newRow = [...row];
    [COL.ALLOC, COL.OBLIG, COL.UNOBLIG_BAL].forEach((colIndex) => {
      if (newRow[colIndex]) newRow[colIndex].v = parseCurrency(newRow[colIndex].v);
    });
    if (newRow[COL.BUR]) newRow[COL.BUR].v = parseBurCell(newRow[COL.BUR]);
    return newRow;
  });

  // --- Totals ---
  let totalAllocation = 0;
  let totalObligated = 0;
  let totalUnobligated = 0;

  dataRows.forEach((r) => {
    totalAllocation += Number(r[COL.ALLOC]?.v) || 0;
    totalObligated += Number(r[COL.OBLIG]?.v) || 0;
    totalUnobligated += Number(r[COL.UNOBLIG_BAL]?.v) || 0;
  });

  const burPercent = totalAllocation ? (totalObligated / totalAllocation) * 100 : 0;

  const totalAllocationEl = document.getElementById("totalAllocation");
  const totalObligatedEl = document.getElementById("totalObligated");
  const totalUnobligatedEl = document.getElementById("totalUnobligated");
  const burRateEl = document.getElementById("burRate");

  if (totalAllocationEl) totalAllocationEl.innerText = `₱${totalAllocation.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  if (totalObligatedEl) totalObligatedEl.innerText = `₱${totalObligated.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  if (totalUnobligatedEl) totalUnobligatedEl.innerText = `₱${totalUnobligated.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  if (burRateEl) burRateEl.innerText = `${burPercent.toFixed(2)}%`;

  // --- Program Totals (for charts) ---
  const programTotals = {};
  const programObligationTotals = {};
  dataRows.forEach((r) => {
    const program = r[COL.PROGRAM]?.f || r[COL.PROGRAM]?.v || "Unlabeled";
    if (!programTotals[program]) {
      programTotals[program] = 0;
      programObligationTotals[program] = 0;
    }
    programTotals[program] += Number(r[COL.ALLOC]?.v) || 0;
    programObligationTotals[program] += Number(r[COL.OBLIG]?.v) || 0;
  });

  const programLabels = Object.keys(programTotals);
  const programData = Object.values(programTotals);
  const programObligationData = programLabels.map((p) => programObligationTotals[p]);

  window.chartData = { dataRows, programLabels, programData, programObligationData, COL };

  // ------------------------------------------------------------------
  // "Per UACS" tab -> Per UACS View (allocation/obligation/unobligated
  // broken down by UACS object code, instead of monthly projections —
  // this tab doesn't carry monthly figures)
  // ------------------------------------------------------------------
  const { colLabels: uacsColLabels, rows: uacsRawRows } = await fetchTab("Per UACS");
  const { headerRow: uacsHeaderRow, dataRows: uacsResolvedRows } = resolveHeaderAndData(uacsColLabels, uacsRawRows);
  let uacsDataRows = uacsResolvedRows.filter((r) => r.some((c) => c.v !== "" && c.v !== 0));

  const UACS_COL = mapColumnsByHeader(uacsHeaderRow, {
    COMPONENT_PROGRAM: ["Component Program"],
    PROGRAM: ["Component Program"],
    FUND_SOURCE: ["Fund Source"],
    ACTIVITY: ["Specific Activity"],
    OBJECT_CODE: ["Object Code"],
    OBJECT_NAME: ["Object Name"],
    SUBARO: ["Sub-ARO No.", "Sub-ARO"],
    ALLOC: ["Total Allocation per Sub-ARO", "Allocation"],
    OBLIG: ["Obligation"],
    BUR: ["BUR"],
    UNOBLIG_BAL: ["Unobligated Balances"],
  });

  const missingUacsCols = Object.entries(UACS_COL).filter(([, idx]) => idx === -1).map(([field]) => field);
  if (missingUacsCols.length) {
    console.warn('Per UACS tab: could not find a column for:', missingUacsCols.join(", "));
  }

  uacsDataRows = uacsDataRows.map((row) => {
    const newRow = [...row];
    [UACS_COL.ALLOC, UACS_COL.OBLIG, UACS_COL.UNOBLIG_BAL].forEach((colIndex) => {
      if (newRow[colIndex]) newRow[colIndex].v = parseCurrency(newRow[colIndex].v);
    });
    if (newRow[UACS_COL.BUR]) newRow[UACS_COL.BUR].v = parseBurCell(newRow[UACS_COL.BUR]);
    return newRow;
  });

  let totalUacsAllocation = 0;
  let totalUacsObligation = 0;
  let totalUacsUnobligated = 0;

  uacsDataRows.forEach((r) => {
    totalUacsAllocation += Number(r[UACS_COL.ALLOC]?.v) || 0;
    totalUacsObligation += Number(r[UACS_COL.OBLIG]?.v) || 0;
    totalUacsUnobligated += Number(r[UACS_COL.UNOBLIG_BAL]?.v) || 0;
  });

  const uacsBurPercent = totalUacsAllocation ? (totalUacsObligation / totalUacsAllocation) * 100 : 0;

  const totalUacsAllocationEl = document.getElementById("totalProjectedAllocation");
  const totalUacsObligationEl = document.getElementById("totalProjectedObligation");
  const totalUacsUnobligatedEl = document.getElementById("totalProjectedUnobligated");
  const uacsBurRateEl = document.getElementById("projectedBurRate");

  if (totalUacsAllocationEl) totalUacsAllocationEl.innerText = `₱${totalUacsAllocation.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  if (totalUacsObligationEl) totalUacsObligationEl.innerText = `₱${totalUacsObligation.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  if (totalUacsUnobligatedEl) totalUacsUnobligatedEl.innerText = `₱${totalUacsUnobligated.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  if (uacsBurRateEl) uacsBurRateEl.innerText = `${uacsBurPercent.toFixed(2)}%`;

  // Program totals (still used for the filter chips shared with the main view)
  const uacsProgramTotals = {};
  uacsDataRows.forEach((r) => {
    const program = r[UACS_COL.PROGRAM]?.f || r[UACS_COL.PROGRAM]?.v || "Unlabeled";
    const allocation = Number(r[UACS_COL.ALLOC]?.v) || 0;
    if (!uacsProgramTotals[program]) uacsProgramTotals[program] = 0;
    uacsProgramTotals[program] += allocation;
  });

  // Object-code totals, which is what the Per UACS charts actually key off
  const objectTotals = { allocation: {}, obligation: {}, unobligated: {} };
  uacsDataRows.forEach((r) => {
    const object = r[UACS_COL.OBJECT_NAME]?.f || r[UACS_COL.OBJECT_NAME]?.v || "Unlabeled";
    objectTotals.allocation[object] = (objectTotals.allocation[object] || 0) + (Number(r[UACS_COL.ALLOC]?.v) || 0);
    objectTotals.obligation[object] = (objectTotals.obligation[object] || 0) + (Number(r[UACS_COL.OBLIG]?.v) || 0);
    objectTotals.unobligated[object] = (objectTotals.unobligated[object] || 0) + (Number(r[UACS_COL.UNOBLIG_BAL]?.v) || 0);
  });

  window.projectionData = {
    dataRows: uacsDataRows,
    programLabels: Object.keys(uacsProgramTotals),
    programData: Object.values(uacsProgramTotals),
    objectTotals,
    COL: UACS_COL,
    totals: {
      allocation: totalUacsAllocation,
      obligation: totalUacsObligation,
      unobligation: totalUacsUnobligated,
      bur: uacsBurPercent,
    },
  };

  document.dispatchEvent(new CustomEvent("projectionDataReady", { detail: window.projectionData }));

  // Note: the table body itself is rendered by logic.js's renderTable(),
  // which listens for the "dataReady" event dispatched below. This keeps
  // table rendering in one place instead of two.
  document.dispatchEvent(new CustomEvent("dataReady", { detail: window.chartData }));
});
