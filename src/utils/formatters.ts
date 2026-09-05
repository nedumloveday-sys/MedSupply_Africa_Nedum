import { InventoryRecord } from '../types';

export function formatNaira(amount: number, decimals: number = 2): string {
  if (isNaN(amount)) return '₦0.00';
  return (
    '₦' +
    amount.toLocaleString('en-NG', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

export function formatNumber(n: number): string {
  if (isNaN(n)) return '0';
  return n.toLocaleString('en-US');
}

export function formatPercent(rate: number): string {
  if (isNaN(rate)) return '0.0%';
  return `${(rate * 100).toFixed(1)}%`;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function exportToCsv(records: InventoryRecord[], filename: string = 'medsupply_filtered_inventory.csv') {
  if (records.length === 0) return;

  const headers = [
    'Product_ID',
    'Drug_Name',
    'Category',
    'State',
    'Supplier',
    'Units_Sold',
    'Stock_Remaining',
    'Reorder_Point',
    'Price_Per_Unit_NGN',
    'Revenue_NGN',
    'Month',
    'Expiry_Date',
    'Batch_No',
    'Storage_Condition',
    'Below_Reorder_Point',
    'Data_Quality_Flag',
  ];

  const rows = records.map((r) => [
    r.Product_ID,
    `"${r.Drug_Name.replace(/"/g, '""')}"`,
    `"${r.Category}"`,
    `"${r.State}"`,
    `"${r.Supplier}"`,
    r.Units_Sold,
    r.Stock_Remaining,
    r.Reorder_Point,
    r.Price_Per_Unit_NGN.toFixed(2),
    r.Revenue_NGN.toFixed(2),
    `"${r.Month}"`,
    formatDate(r.Expiry_Date),
    `"${r.Batch_No}"`,
    `"${r.Storage_Condition}"`,
    r.Below_Reorder_Point ? 'TRUE' : 'FALSE',
    `"${(r.Data_Quality_Flag || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
