import { InventoryRecord, DashboardMetrics, FilterState } from '../types';
import { formatNaira, formatNumber, formatPercent, formatDate } from './formatters';

export function answerDashboardQuestion(
  query: string,
  data: InventoryRecord[],
  allData: InventoryRecord[],
  metrics: DashboardMetrics,
  filters: FilterState
): string {
  const q = query.toLowerCase().trim();

  // 1. Revenue & Units Sold
  if (q.includes('revenue') || q.includes('total sales') || q.includes('how much') || (q.includes('units') && q.includes('sold'))) {
    return `📊 **Revenue & Sales Overview** (${data.length} active batches):
• **Total Filtered Revenue:** **${formatNaira(metrics.totalRevenue, 2)}**
• **Total Units Sold:** **${formatNumber(metrics.totalUnitsSold)} units**
• **Average Unit Price:** **${formatNaira(metrics.averagePricePerUnit, 2)}**
${
  filters.excludeOutliers
    ? `*(Note: The MED-143 99,999-unit typo is currently excluded for data accuracy).*`
    : `*(Note: Raw figure includes the MED-143 outlier of 99,999 units).*`
}`;
  }

  // 2. Below Reorder Point / Stockout / Restock
  if (q.includes('reorder') || q.includes('shortfall') || q.includes('stockout') || q.includes('restock') || q.includes('deficit')) {
    const belowItems = [...data]
      .filter((r) => r.Below_Reorder_Point)
      .sort((a, b) => b.Shortfall - a.Shortfall);

    if (belowItems.length === 0) {
      return `✅ **Reorder Status:** None of the ${data.length} items in the current view are below their critical reorder threshold! All stock levels are sufficient.`;
    }

    const topDeficits = belowItems.slice(0, 4);
    const deficitList = topDeficits
      .map(
        (item) =>
          `• **${item.Drug_Name}** at **${item.State}** hub (Supplier: ${item.Supplier}): Stock remaining is **${item.Stock_Remaining}** vs Reorder Point of **${item.Reorder_Point}** (Deficit: **-${item.Shortfall} units**)`
      )
      .join('\n');

    return `⚠️ **Reorder & Critical Shortfall Alert**:
• **${metrics.belowReorderCount} of ${data.length} batches (${formatPercent(metrics.belowReorderPercent)})** are currently **BELOW** their reorder point.
• **Top Urgent Restock Needs:**
${deficitList}
💡 Recommended action: Prioritize emergency restock purchase orders with AfriPharma, GlobalMed, and MediSource for these distribution hubs.`;
  }

  // 3. Expiry Risk / Shelf Life / FIFO
  if (q.includes('expir') || q.includes('shelf life') || q.includes('fifo') || q.includes('spoil')) {
    const sortedByExp = [...data].sort((a, b) => a.Expiry_Date.getTime() - b.Expiry_Date.getTime());
    const criticalExp = sortedByExp.filter((r) => r.daysToExpiry <= 90);
    const moderateExp = sortedByExp.filter((r) => r.daysToExpiry > 90 && r.daysToExpiry <= 180);

    const next3 = sortedByExp.slice(0, 3);
    const next3List = next3
      .map(
        (r) =>
          `• **${r.Drug_Name}** (Batch **${r.Batch_No}**, **${r.State}**): Expires **${formatDate(r.Expiry_Date)}** (${r.daysToExpiry} days left, Stock: ${r.Stock_Remaining} units, Storage: *${r.Storage_Condition}*)`
      )
      .join('\n');

    return `⏳ **Expiry Risk Audit**:
• **Critical (< 90 Days):** **${criticalExp.length} batches**
• **Moderate Warning (90–180 Days):** **${moderateExp.length} batches**
• **Total Batches at Imminent Risk:** **${criticalExp.length + moderateExp.length} batches**

**Batches Closest to Expiration (Priority FIFO Dispatch):**
${next3List}

💡 Action: Flag these batches for first-in, first-out (FIFO) commercial dispatch or transfer to high-turnover health facilities.`;
  }

  // 4. Specific Drug or Top Drugs
  if (
    q.includes('top drug') ||
    q.includes('highest drug') ||
    q.includes('best seller') ||
    q.includes('most sold') ||
    q.includes('metformin') ||
    q.includes('ors') ||
    q.includes('amoxicillin') ||
    q.includes('paracetamol') ||
    q.includes('artemether') ||
    q.includes('ibuprofen')
  ) {
    const drugRev: Record<string, number> = {};
    const drugVol: Record<string, number> = {};
    data.forEach((r) => {
      drugRev[r.Drug_Name] = (drugRev[r.Drug_Name] || 0) + r.Revenue_NGN;
      drugVol[r.Drug_Name] = (drugVol[r.Drug_Name] || 0) + r.Units_Sold;
    });

    const sortedRev = Object.entries(drugRev).sort((a, b) => b[1] - a[1]);
    const sortedVol = Object.entries(drugVol).sort((a, b) => b[1] - a[1]);

    const topRevDrug = sortedRev[0] || ['N/A', 0];
    const topVolDrug = sortedVol[0] || ['N/A', 0];

    return `💊 **Product Performance Highlights**:
• **Highest Revenue Drug:** **${topRevDrug[0]}** generating **${formatNaira(topRevDrug[1], 0)}**
• **Highest Volume Drug:** **${topVolDrug[0]}** moving **${formatNumber(topVolDrug[1])} units**
• **Top 3 Revenue Contributors:**
${sortedRev
  .slice(0, 3)
  .map(([name, rev], i) => `  ${i + 1}. **${name}**: ${formatNaira(rev, 0)}`)
  .join('\n')}

💡 Tip: Click on any drug row in the Master Table to isolate and analyze its batch-level inventory.`;
  }

  // 5. State Hubs / Geography
  if (
    q.includes('state') ||
    q.includes('hub') ||
    q.includes('lagos') ||
    q.includes('abuja') ||
    q.includes('kano') ||
    q.includes('sokoto') ||
    q.includes('ibadan') ||
    q.includes('port harcourt') ||
    q.includes('geograph')
  ) {
    const stateRev: Record<string, number> = {};
    data.forEach((r) => {
      stateRev[r.State] = (stateRev[r.State] || 0) + r.Revenue_NGN;
    });
    const sortedStates = Object.entries(stateRev).sort((a, b) => b[1] - a[1]);

    const topState = sortedStates[0] || ['N/A', 0];
    const lowestState = sortedStates[sortedStates.length - 1] || ['N/A', 0];

    return `🗺️ **Geographic Distribution & State Hubs**:
• **Number of Active Hubs:** **10 states** across Nigeria
• **Top Performing Hub:** **${topState[0]}** with **${formatNaira(topState[1], 0)}** in sales
• **Lowest Performing Hub:** **${lowestState[0]}** with **${formatNaira(lowestState[1], 0)}** in sales
• **State Revenue Ranking:**
${sortedStates
  .slice(0, 5)
  .map(([st, rev], idx) => `  ${idx + 1}. **${st}**: ${formatNaira(rev, 0)}`)
  .join('\n')}

💡 Note: Sokoto consistently represents the lowest sales volume and may require targeted regional outreach or optimized distribution routes.`;
  }

  // 6. Suppliers
  if (q.includes('supplier') || q.includes('vendor') || q.includes('afripharma') || q.includes('pharmaco') || q.includes('globalmed')) {
    const supMap: Record<string, { rev: number; units: number; count: number }> = {};
    data.forEach((r) => {
      if (!supMap[r.Supplier]) supMap[r.Supplier] = { rev: 0, units: 0, count: 0 };
      supMap[r.Supplier].rev += r.Revenue_NGN;
      supMap[r.Supplier].units += r.Units_Sold;
      supMap[r.Supplier].count += 1;
    });

    const sortedSup = Object.entries(supMap).sort((a, b) => b[1].rev - a[1].rev);

    return `🏢 **Supplier Performance Breakdown**:
We partner with **5 primary pharmaceutical manufacturers**:
${sortedSup
  .map(
    ([name, s], i) =>
      `• **${i + 1}. ${name}**: **${formatNaira(s.rev, 0)}** across **${s.count} batches** (${formatNumber(s.units)} units supplied)`
  )
  .join('\n')}

💡 Quality rating: All 5 suppliers maintain active NAFDAC compliance certifications across the regional hubs.`;
  }

  // 7. Storage Conditions & Cold Chain
  if (q.includes('storage') || q.includes('cold chain') || q.includes('refrigerat') || q.includes('ambient') || q.includes('temperature')) {
    const storageStats: Record<string, { total: number; below: number; expRisk: number }> = {
      Ambient: { total: 0, below: 0, expRisk: 0 },
      'Cool & Dry': { total: 0, below: 0, expRisk: 0 },
      Refrigerated: { total: 0, below: 0, expRisk: 0 },
    };

    data.forEach((r) => {
      if (storageStats[r.Storage_Condition]) {
        storageStats[r.Storage_Condition].total += 1;
        if (r.Below_Reorder_Point) storageStats[r.Storage_Condition].below += 1;
        if (r.daysToExpiry <= 90) storageStats[r.Storage_Condition].expRisk += 1;
      }
    });

    return `❄️ **Storage Condition & Cold-Chain Health**:
• **Ambient (Room Temp):** ${storageStats.Ambient.total} batches (${storageStats.Ambient.below} below reorder, ${storageStats.Ambient.expRisk} near expiry)
• **Cool & Dry (15°C–25°C):** ${storageStats['Cool & Dry'].total} batches (${storageStats['Cool & Dry'].below} below reorder, ${storageStats['Cool & Dry'].expRisk} near expiry)
• **Refrigerated (Cold Chain 2°C–8°C):** ${storageStats.Refrigerated.total} batches (${storageStats.Refrigerated.below} below reorder, ${storageStats.Refrigerated.expRisk} near expiry)

🚨 Cold chain supplies require continuous temperature logging during transit across Northern and Southern Nigerian transit corridors.`;
  }

  // 8. Data Quality & Flags / MED-143
  if (
    q.includes('data quality') ||
    q.includes('flag') ||
    q.includes('med-143') ||
    q.includes('typo') ||
    q.includes('outlier') ||
    q.includes('error') ||
    q.includes('caveat')
  ) {
    return `🛡️ **Data Quality & Integrity Audit**:
Exactly **44 of 207 records (21.3%)** carry verification caveats:
1. **Statistical Outlier Typo (Row MED-143):**
   • Drug: *Metformin 500mg* in Kaduna hub.
   • Units Sold: **99,999 units** (₦10,899,891).
   • Standard distribution range is 100–1,500 units; this 99,999 entry is flagged as an obvious data entry error. The dashboard provides an **Exclude Outlier** toggle so it does not distort financial KPIs.
2. **Ambiguous Date Formats (43 rows):**
   • Slash date strings where both day and month are ≤ 12 (e.g., 04/05/2025). The parser transparently logs these and defaults to DD/MM/YYYY.`;
  }

  // 9. Pricing / Average Price
  if (q.includes('price') || q.includes('cost') || q.includes('naira') || q.includes('expensive') || q.includes('cheap')) {
    return `💵 **Pricing & Cost Structure**:
• **Average Unit Price:** **${formatNaira(metrics.averagePricePerUnit, 2)}**
• **Highest Unit Price SKU:** Metformin 500mg and specialised cardiovascular formulations.
• **Most Affordable High-Volume SKU:** ORS Sachets and Zinc Sulfate.
• **Currency:** Nigerian Naira (₦, NGN).`;
  }

  // Default Fallback
  return `🤖 **MedSupply Africa Assistant**:
I can answer detailed questions regarding our 207 inventory batches across Nigeria! Here are questions you can ask me:
• *"What is our total revenue and units sold?"*
• *"Which SKUs are below reorder point and need urgent restock?"*
• *"Which batches are expiring within 90 days?"*
• *"Who is our highest revenue drug and top supplier?"*
• *"What is the data quality caveat regarding MED-143?"*
• *"How are our 10 state hubs performing?"*

How may I assist your supply chain analysis today?`;
}
