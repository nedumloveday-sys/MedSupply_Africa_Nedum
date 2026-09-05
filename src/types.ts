export interface InventoryRecord {
  Product_ID: string;
  Drug_Name: string;
  Category: string;
  State: string;
  Supplier: string;
  Units_Sold: number;
  Stock_Remaining: number;
  Reorder_Point: number;
  Price_Per_Unit_NGN: number;
  Revenue_NGN: number;
  Month: string; // Standardized "Jan-2024", etc.
  rawMonth: string;
  monthOrder: number; // 1 to 12 for 2024
  Expiry_Date: Date;
  expiryDateStr: string; // YYYY-MM-DD
  rawExpiryDate: string;
  Batch_No: string;
  Storage_Condition: 'Ambient' | 'Cool & Dry' | 'Refrigerated';
  rawStorageCondition: string;
  Below_Reorder_Point: boolean;
  Shortfall: number;
  Data_Quality_Flag: string;
  daysToExpiry: number;
  expiryRiskCategory: 'expired' | 'critical_90' | 'warning_180' | 'normal';
  isOutlier: boolean;
}

export interface FilterState {
  searchQuery: string;
  selectedStates: string[];
  selectedCategories: string[];
  selectedSuppliers: string[];
  selectedStorage: string[];
  selectedMonths: string[];
  onlyBelowReorder: boolean;
  onlyExpiringSoon: boolean;
  onlyDataQualityFlagged: boolean;
  excludeOutliers: boolean;
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalUnitsSold: number;
  totalSKUs: number;
  belowReorderCount: number;
  belowReorderPercent: number;
  expiring90dCount: number;
  expiring90dPercent: number;
  averagePricePerUnit: number;
  dataQualityFlaggedCount: number;
  dataQualityFlaggedPercent: number;
  maxExpiryDate: Date;
}
