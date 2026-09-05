import * as XLSX from 'xlsx';
import { InventoryRecord } from '../types';

const MONTH_NAMES = [
  'Jan-2024',
  'Feb-2024',
  'Mar-2024',
  'Apr-2024',
  'May-2024',
  'Jun-2024',
  'Jul-2024',
  'Aug-2024',
  'Sep-2024',
  'Oct-2024',
  'Nov-2024',
  'Dec-2024',
];

export function normalizeMonth(monthStr: string): { standardMonth: string; monthOrder: number } {
  if (!monthStr) return { standardMonth: 'Unknown', monthOrder: 0 };
  const clean = monthStr.trim().toLowerCase();

  // Pattern: "03/2024" or "3/2024"
  if (clean.includes('/')) {
    const parts = clean.split('/');
    const m = parseInt(parts[0], 10);
    if (m >= 1 && m <= 12) {
      return { standardMonth: MONTH_NAMES[m - 1], monthOrder: m };
    }
  }

  // Pattern: "Jan-2024", "January 2024", "jan", etc.
  const map: Record<string, number> = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12,
  };

  for (const [key, val] of Object.entries(map)) {
    if (clean.startsWith(key) || clean.includes(key)) {
      return { standardMonth: MONTH_NAMES[val - 1], monthOrder: val };
    }
  }

  return { standardMonth: monthStr.trim(), monthOrder: 99 };
}

export function normalizeStorage(val: string): 'Ambient' | 'Cool & Dry' | 'Refrigerated' {
  if (!val) return 'Ambient';
  const s = val.toLowerCase().trim();
  if (s.includes('refrig')) return 'Refrigerated';
  if (s.includes('cool') || s.includes('dry')) return 'Cool & Dry';
  return 'Ambient';
}

export interface ParsedDateResult {
  date: Date;
  dateStr: string;
  isAmbiguous: boolean;
  notes?: string;
}

export function parseExpiryDate(dateStr: string): ParsedDateResult {
  if (!dateStr) {
    const d = new Date(2026, 0, 1);
    return { date: d, dateStr: '2026-01-01', isAmbiguous: false };
  }

  const clean = dateStr.trim();

  // Pattern: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const parts = clean.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return { date: d, dateStr: clean, isAmbiguous: false };
  }

  // Pattern: DD-Mon-YYYY (e.g. 29-May-2027 or 02-Sep-2026)
  if (/^\d{1,2}-[a-zA-Z]{3}-\d{4}$/.test(clean)) {
    const parts = clean.split('-');
    const day = parseInt(parts[0], 10);
    const monStr = parts[1].toLowerCase();
    const year = parseInt(parts[2], 10);
    const monthsMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const m = monthsMap[monStr] ?? 0;
    const d = new Date(year, m, day);
    const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { date: d, dateStr, isAmbiguous: false };
  }

  // Pattern with slash: "04/12/2027", "11/19/2025", "29/09/2026"
  if (clean.includes('/')) {
    const parts = clean.split('/').map((s) => parseInt(s.trim(), 10));
    if (parts.length === 3) {
      let p1 = parts[0];
      let p2 = parts[1];
      const year = parts[2];
      let month = p1;
      let day = p2;
      let isAmbiguous = false;

      if (p1 > 12) {
        // Must be DD/MM/YYYY
        day = p1;
        month = p2;
        isAmbiguous = false;
      } else if (p2 > 12) {
        // Must be MM/DD/YYYY
        month = p1;
        day = p2;
        isAmbiguous = false;
      } else {
        // Both <= 12: Ambiguous! Dataset convention assumed DD/MM/YYYY (or MM/DD/YYYY)
        // Flagged as data quality caveat
        isAmbiguous = true;
        // Default assumption: DD/MM/YYYY
        day = p1;
        month = p2;
      }

      const d = new Date(year, month - 1, day);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return {
        date: d,
        dateStr,
        isAmbiguous,
        notes: isAmbiguous
          ? `Ambiguous slash date format (${clean}); day/month order assumed as DD/MM/YYYY`
          : undefined,
      };
    }
  }

  // Fallback to JS Date parser
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = parsed.getMonth() + 1;
    const d = parsed.getDate();
    return {
      date: parsed,
      dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      isAmbiguous: false,
    };
  }

  const d = new Date(2026, 0, 1);
  return { date: d, dateStr: '2026-01-01', isAmbiguous: true, notes: `Invalid date format: ${clean}` };
}

export function parseInventoryCsv(csvText: string): InventoryRecord[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const rawHeaders = lines[0].split(',').map((h) => h.trim());
  const headerMap: Record<string, number> = {};
  rawHeaders.forEach((h, idx) => {
    headerMap[h.toLowerCase().replace(/[^a-z0-9_]/g, '')] = idx;
  });

  const getCol = (cols: string[], name: string, fallbackIdx: number): string => {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const idx = headerMap[cleanName];
    if (idx !== undefined && cols[idx] !== undefined) {
      return cols[idx].trim();
    }
    return cols[fallbackIdx]?.trim() ?? '';
  };

  const records: InventoryRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split CSV handling simple comma delimiter
    const cols = line.split(',');

    const product_id = getCol(cols, 'Product_ID', 0);
    const drug_name = getCol(cols, 'Drug_Name', 1);
    const category = getCol(cols, 'Category', 2);
    const state = getCol(cols, 'State', 3);
    const supplier = getCol(cols, 'Supplier', 4);
    const units_sold_raw = getCol(cols, 'Units_Sold', 5);
    const stock_remaining_raw = getCol(cols, 'Stock_Remaining', 6);
    const reorder_point_raw = getCol(cols, 'Reorder_Point', 7);
    const price_raw = getCol(cols, 'Price_Per_Unit_NGN', 8);
    const revenue_raw = getCol(cols, 'Revenue_NGN', 9);
    const month_raw = getCol(cols, 'Month', 10);
    const expiry_raw = getCol(cols, 'Expiry_Date', 11);
    const batch_no = getCol(cols, 'Batch_No', 12);
    const storage_raw = getCol(cols, 'Storage_Condition', 13);
    const user_flag_raw = getCol(cols, 'Data_Quality_Flag', 14);

    const units_sold = parseInt(units_sold_raw.replace(/[^0-9-]/g, ''), 10) || 0;
    const stock_remaining = parseInt(stock_remaining_raw.replace(/[^0-9-]/g, ''), 10) || 0;
    const reorder_point = parseInt(reorder_point_raw.replace(/[^0-9-]/g, ''), 10) || 0;
    const price_per_unit = parseFloat(price_raw.replace(/[^0-9.-]/g, '')) || 0;
    let revenue = parseFloat(revenue_raw.replace(/[^0-9.-]/g, ''));
    if (isNaN(revenue) || revenue === 0) {
      revenue = units_sold * price_per_unit;
    }

    const { standardMonth, monthOrder } = normalizeMonth(month_raw);
    const storage = normalizeStorage(storage_raw);
    const parsedDate = parseExpiryDate(expiry_raw);

    const below_reorder = stock_remaining < reorder_point;
    const shortfall = below_reorder ? reorder_point - stock_remaining : 0;

    // Outlier check: units sold > 20,000 (such as MED-143 with 99,999 units)
    const isOutlier = units_sold >= 20000;

    let flag = user_flag_raw || '';
    if (!flag) {
      if (isOutlier) {
        flag = `Suspected data-entry typo: ${units_sold.toLocaleString()} units sold (statistical outlier)`;
      } else if (parsedDate.isAmbiguous) {
        flag = parsedDate.notes || `Ambiguous date format: assumed DD/MM/YYYY for ${expiry_raw}`;
      }
    }

    records.push({
      Product_ID: product_id,
      Drug_Name: drug_name,
      Category: category,
      State: state,
      Supplier: supplier,
      Units_Sold: units_sold,
      Stock_Remaining: stock_remaining,
      Reorder_Point: reorder_point,
      Price_Per_Unit_NGN: price_per_unit,
      Revenue_NGN: revenue,
      Month: standardMonth,
      rawMonth: month_raw,
      monthOrder,
      Expiry_Date: parsedDate.date,
      expiryDateStr: parsedDate.dateStr,
      rawExpiryDate: expiry_raw,
      Batch_No: batch_no,
      Storage_Condition: storage,
      rawStorageCondition: storage_raw,
      Below_Reorder_Point: below_reorder,
      Shortfall: shortfall,
      Data_Quality_Flag: flag,
      daysToExpiry: 0, // Populated in post-processing relative to maxExpiryDate
      expiryRiskCategory: 'normal',
      isOutlier,
    });
  }

  // Determine latest Expiry_Date in the dataset to treat as reference point ("today" for demo)
  let maxDate = new Date(2027, 11, 29);
  if (records.length > 0) {
    const dates = records.map((r) => r.Expiry_Date.getTime()).filter((t) => !isNaN(t));
    if (dates.length > 0) {
      maxDate = new Date(Math.max(...dates));
    }
  }

  // Calculate daysToExpiry and risk categories
  records.forEach((r) => {
    // Days relative to maxDate or current date
    const diffMs = r.Expiry_Date.getTime() - maxDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    r.daysToExpiry = diffDays;

    // If diffDays is between -90 and 0 (or <= 90 if reference is now)
    // We categorize based on distance to expiration:
    // Prompt says: "batches expiring within 90 days of the latest Expiry_Date in the dataset (treat that max date as 'today' for the demo)"
    // Or for forward-looking: < 90 days, < 180 days, etc.
    if (diffDays <= 0) {
      r.expiryRiskCategory = 'expired';
    } else if (diffDays <= 90) {
      r.expiryRiskCategory = 'critical_90';
    } else if (diffDays <= 180) {
      r.expiryRiskCategory = 'warning_180';
    } else {
      r.expiryRiskCategory = 'normal';
    }
  });

  return records;
}

export async function parseXlsxFile(fileOrBuffer: File | ArrayBuffer): Promise<InventoryRecord[]> {
  const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames.find((n) => n.toLowerCase().includes('cleaned')) || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const csv = XLSX.utils.sheet_to_csv(sheet);
  return parseInventoryCsv(csv);
}

export function computeMetrics(records: InventoryRecord[]): import('../types').DashboardMetrics {
  const totalSKUs = records.length;
  if (totalSKUs === 0) {
    return {
      totalRevenue: 0,
      totalUnitsSold: 0,
      totalSKUs: 0,
      belowReorderCount: 0,
      belowReorderPercent: 0,
      expiring90dCount: 0,
      expiring90dPercent: 0,
      averagePricePerUnit: 0,
      dataQualityFlaggedCount: 0,
      dataQualityFlaggedPercent: 0,
      maxExpiryDate: new Date(2027, 11, 29),
    };
  }

  let totalRevenue = 0;
  let totalUnitsSold = 0;
  let belowReorderCount = 0;
  let expiring90dCount = 0;
  let totalPrice = 0;
  let dataQualityFlaggedCount = 0;

  const validDates = records.map((r) => r.Expiry_Date.getTime()).filter((t) => !isNaN(t));
  const maxDateMs = validDates.length > 0 ? Math.max(...validDates) : new Date(2027, 11, 29).getTime();
  const maxExpiryDate = new Date(maxDateMs);

  records.forEach((r) => {
    totalRevenue += r.Revenue_NGN;
    totalUnitsSold += r.Units_Sold;
    totalPrice += r.Price_Per_Unit_NGN;
    if (r.Below_Reorder_Point) {
      belowReorderCount++;
    }
    // "Number of batches expiring within 90 days of the latest Expiry_Date in the dataset"
    const diffDays = Math.abs((maxDateMs - r.Expiry_Date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 90) {
      expiring90dCount++;
    }
    if (r.Data_Quality_Flag && r.Data_Quality_Flag.trim() !== '') {
      dataQualityFlaggedCount++;
    }
  });

  return {
    totalRevenue,
    totalUnitsSold,
    totalSKUs,
    belowReorderCount,
    belowReorderPercent: (belowReorderCount / totalSKUs) * 100,
    expiring90dCount,
    expiring90dPercent: (expiring90dCount / totalSKUs) * 100,
    averagePricePerUnit: totalPrice / totalSKUs,
    dataQualityFlaggedCount,
    dataQualityFlaggedPercent: (dataQualityFlaggedCount / totalSKUs) * 100,
    maxExpiryDate,
  };
}
