# Dashboard - Platform Spend Metrics

**Technical Documentation:** [../System/dashboard.md](../System/dashboard.md)

## User Need & Purpose

Business owners need to track their advertising spend across multiple platforms (Google Ads, Facebook Ads) to understand their marketing investment and make informed budget decisions.

## Business Context

### Target Users
- **Business Owners**: Monitor marketing spend and ROI
- **Marketing Managers**: Track campaign budgets
- **Sales Managers**: Understand lead generation costs

### Business Value
- Centralized view of all advertising spend
- Quick identification of budget trends
- Time-period filtering for spend analysis
- Platform-specific spend breakdown

## User Workflows

### Viewing Platform Spend
1. User navigates to Dashboard section
2. System displays total platform spend prominently
3. Individual platform cards show Google and Facebook spend
4. User can see spend breakdown at a glance

### Filtering by Time Period
1. User selects time period filter (7, 15, 30, 60, or 90 days)
2. System recalculates spend for selected period
3. Total and platform-specific amounts update
4. User compares spend across different timeframes

### Understanding Platform Breakdown
1. User views total spend at top of component
2. Scrolls down to see individual platform cards
3. Google Ads card shows Google-specific spend
4. Facebook Ads card shows Facebook-specific spend
5. Each platform displays with branded colors and logos

## Feature Requirements

### Platform Spend Display
- Total spend prominently displayed at top
- Currency formatted without cents ($1,234 format)
- Individual platform cards in responsive grid
- Official brand colors and logos for each platform
- Clear visual hierarchy (total vs. individual)

### Time Period Filtering
- Predefined periods: 7, 15, 30, 60, 90 days
- Active filter visually highlighted
- Instant data refresh on filter change
- Default to 30-day period

### Platform Support
- **Google Ads**: Blue (#4285F4) branding with Google logo
- **Facebook Ads**: Blue (#1877F2) branding with Facebook logo
- Extensible for additional platforms in future

### Visual Design
- Clean, minimal interface without clutter
- No unnecessary backgrounds or decorations
- Responsive grid layout (1 column mobile, 2 columns desktop)
- Hover effects on platform cards
- Consistent purple theme for metrics

## Edge Cases

### No Spend Data
- Business has no advertising spend recorded
- Shows $0 for total and all platforms
- Empty state message: "No spend data for this period"
- Encourages data integration

### Single Platform Usage
- Business only uses one platform (e.g., Google only)
- Shows $0 for unused platforms
- Total reflects actual spend correctly
- No confusion about missing data

### Large Spend Amounts
- Spend exceeds typical ranges ($100,000+)
- Currency formatting handles large numbers
- Numbers remain readable with proper comma separation
- No UI overflow or truncation

### Future Date Range
- User selects time period extending into future
- System only includes past/current data
- No projection or forecasting shown
- Clear date range in filter display

### Data Refresh Timing
- User switches businesses
- New business data loads smoothly
- Loading state shows during data fetch
- No flicker or layout shift
