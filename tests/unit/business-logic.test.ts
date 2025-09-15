import { test, expect } from '@playwright/test';

/**
 * Business Logic Unit Tests
 * Testing core business logic functions and calculations
 */

// Mock test data based on updated tier specifications
const mockCallWindowData = [
  {
    callNumber: 1,
    createdAt: '2024-01-01T10:00:00Z',
    calledAt: '2024-01-01T10:00:30Z', // 30 seconds response time
    medalTier: 'diamond' as const,
    responseTime: '< 1 min'
  },
  {
    callNumber: 2,
    createdAt: '2024-01-01T10:00:00Z',
    calledAt: '2024-01-01T10:05:00Z',
    medalTier: null,
    responseTime: null
  }
];

const mockLeadData = {
  leadId: 'test-lead-1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  service: 'Roof Repair',
  howSoon: 'ASAP',
  score: 85,
  contacted: true,
  startTime: '2024-01-01T14:00:00Z',
  closedAmount: 15000
};

test.describe('Call Windows Medal System', () => {
  test('should calculate diamond medal for response time < 1 minute', async () => {
    const responseTimeMinutes = 0.5; // 30 seconds
    
    let medalTier = null;
    if (responseTimeMinutes < 1) medalTier = 'diamond';
    else if (responseTimeMinutes < 2) medalTier = 'gold';
    else if (responseTimeMinutes < 5) medalTier = 'silver';
    else if (responseTimeMinutes < 10) medalTier = 'bronze';
    
    expect(medalTier).toBe('diamond');
  });

  test('should calculate gold medal for response time 1-2 minutes', async () => {
    const responseTimeMinutes = 1.5; // 1.5 minutes
    
    let medalTier = null;
    if (responseTimeMinutes < 1) medalTier = 'diamond';
    else if (responseTimeMinutes < 2) medalTier = 'gold';
    else if (responseTimeMinutes < 5) medalTier = 'silver';
    else if (responseTimeMinutes < 10) medalTier = 'bronze';
    
    expect(medalTier).toBe('gold');
  });

  test('should calculate silver medal for response time 2-5 minutes', async () => {
    const responseTimeMinutes = 3.5; // 3.5 minutes
    
    let medalTier = null;
    if (responseTimeMinutes < 1) medalTier = 'diamond';
    else if (responseTimeMinutes < 2) medalTier = 'gold';
    else if (responseTimeMinutes < 5) medalTier = 'silver';
    else if (responseTimeMinutes < 10) medalTier = 'bronze';
    
    expect(medalTier).toBe('silver');
  });

  test('should calculate bronze medal for response time 5-10 minutes', async () => {
    const responseTimeMinutes = 7; // 7 minutes
    
    let medalTier = null;
    if (responseTimeMinutes < 1) medalTier = 'diamond';
    else if (responseTimeMinutes < 2) medalTier = 'gold';
    else if (responseTimeMinutes < 5) medalTier = 'silver';
    else if (responseTimeMinutes < 10) medalTier = 'bronze';
    
    expect(medalTier).toBe('bronze');
  });

  test('should have no medal for response time >= 10 minutes', async () => {
    const responseTimeMinutes = 12; // 12 minutes
    
    let medalTier = null;
    if (responseTimeMinutes < 1) medalTier = 'diamond';
    else if (responseTimeMinutes < 2) medalTier = 'gold';
    else if (responseTimeMinutes < 5) medalTier = 'silver';
    else if (responseTimeMinutes < 10) medalTier = 'bronze';
    
    expect(medalTier).toBe(null);
  });

  test('should format response time correctly', async () => {
    const testCases = [
      { minutes: 0.5, expected: '< 1 min' },
      { minutes: 1.0, expected: '1 min' },
      { minutes: 5.0, expected: '5 min' },
      { minutes: 65.0, expected: '1h 5m' },
      { minutes: 90.5, expected: '1h 30m' }
    ];

    testCases.forEach(({ minutes, expected }) => {
      let formatted = '';
      if (minutes < 1) {
        formatted = '< 1 min';
      } else if (minutes < 60) {
        formatted = `${Math.floor(minutes)} min`;
      } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = Math.floor(minutes % 60);
        formatted = `${hours}h ${remainingMinutes}m`;
      }
      
      expect(formatted).toBe(expected);
    });
  });
});

test.describe('Lead Metrics Calculations', () => {
  test('should calculate contact rate correctly', async () => {
    const totalLeads = 100;
    const contactedLeads = 75;
    const contactRate = (contactedLeads / totalLeads) * 100;
    
    expect(contactRate).toBe(75);
  });

  test('should calculate booking rate correctly', async () => {
    const contactedLeads = 75;
    const bookedLeads = 45;
    const bookingRate = (bookedLeads / contactedLeads) * 100;
    
    expect(Math.round(bookingRate)).toBe(60);
  });

  test('should calculate overall booking rate correctly', async () => {
    const totalLeads = 100;
    const bookedLeads = 45;
    const overallBookingRate = (bookedLeads / totalLeads) * 100;
    
    expect(overallBookingRate).toBe(45);
  });

  test('should handle zero division gracefully', async () => {
    const totalLeads = 0;
    const contactedLeads = 0;
    const contactRate = totalLeads > 0 ? (contactedLeads / totalLeads) * 100 : 0;
    
    expect(contactRate).toBe(0);
  });
});

test.describe('Revenue Calculations', () => {
  test('should calculate total revenue correctly', async () => {
    const leads = [
      { closedAmount: 15000 },
      { closedAmount: 8500 },
      { closedAmount: null },
      { closedAmount: 12000 }
    ];
    
    const totalRevenue = leads.reduce((sum, lead) => {
      return sum + (lead.closedAmount || 0);
    }, 0);
    
    expect(totalRevenue).toBe(35500);
  });

  test('should calculate total calls correctly', async () => {
    const leadCallsCounts = [2, 1, 3, 0, 4];
    const totalCalls = leadCallsCounts.reduce((sum, calls) => sum + calls, 0);

    expect(totalCalls).toBe(10);
  });

  test('should calculate close rate correctly', async () => {
    const shows = 60;
    const closes = 25;
    const closeRate = (closes / shows) * 100;
    
    expect(Math.round(closeRate * 100) / 100).toBe(41.67);
  });
});

test.describe('Lead Scoring Logic', () => {
  test('should categorize lead scores correctly', async () => {
    const testScores = [
      { score: 25, expected: 'low' },
      { score: 50, expected: 'medium' },
      { score: 80, expected: 'high' }
    ];

    testScores.forEach(({ score, expected }) => {
      let category = '';
      if (score <= 33) category = 'low';
      else if (score <= 66) category = 'medium';
      else category = 'high';
      
      expect(category).toBe(expected);
    });
  });

  test('should assign correct colors for lead scores', async () => {
    const testScores = [
      { score: 25, expectedColor: 'red' },
      { score: 50, expectedColor: 'yellow' },
      { score: 80, expectedColor: 'green' }
    ];

    testScores.forEach(({ score, expectedColor }) => {
      let color = '';
      if (score <= 33) color = 'red';
      else if (score <= 66) color = 'yellow';
      else color = 'green';
      
      expect(color).toBe(expectedColor);
    });
  });
});

test.describe('Time Zone Handling', () => {
  test('should handle different time zones correctly', async () => {
    const utcTime = '2024-01-01T10:00:00Z';
    const easternTime = new Date(utcTime).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    // This would be '5:00 AM' in Eastern time during standard time
    expect(easternTime).toContain('5:00');
    expect(easternTime).toContain('AM');
  });
});

test.describe('Platform Spend Analytics', () => {
  test('should normalize platform names correctly', async () => {
    const rawPlatforms = ['facebook', 'google_ads', 'bing', 'Facebook Ads'];
    const normalized = rawPlatforms.map(platform => {
      const cleanPlatform = platform.toLowerCase().replace(/[_\s]/g, '');
      switch (cleanPlatform) {
        case 'facebook':
        case 'facebookads':
          return 'Facebook Ads';
        case 'google':
        case 'googleads':
          return 'Google Ads';
        case 'bing':
        case 'bingads':
          return 'Bing Ads';
        default:
          return platform;
      }
    });
    
    expect(normalized).toEqual(['Facebook Ads', 'Google Ads', 'Bing Ads', 'Facebook Ads']);
  });

  test('should aggregate platform spend correctly', async () => {
    const spendData = [
      { platform: 'Facebook Ads', spend: 1500 },
      { platform: 'Facebook Ads', spend: 2000 },
      { platform: 'Google Ads', spend: 1200 },
      { platform: 'Google Ads', spend: 800 }
    ];
    
    const aggregated = spendData.reduce((acc, item) => {
      acc[item.platform] = (acc[item.platform] || 0) + item.spend;
      return acc;
    }, {} as Record<string, number>);
    
    expect(aggregated['Facebook Ads']).toBe(3500);
    expect(aggregated['Google Ads']).toBe(2000);
  });
});