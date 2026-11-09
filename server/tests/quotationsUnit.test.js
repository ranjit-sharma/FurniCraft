import { describe, it, expect } from 'vitest';
import {
  calculateQuotationTotals,
  formatIndianDate,
} from '../src/services/quotationService.js';
import { generateQuotationPdfBuffer } from '../src/services/quotationPdfService.js';
import { createQuotationSchema, updateQuotationSchema } from '../src/validators/schemas.js';

describe('Quotation Calculations & Formatting', () => {
  it('calculates item totals and grand total correctly for SQ FEET and PCS', () => {
    const items = [
      { particular: 'Kitchen Tandem', quantity: 150, unit: 'SQ FEET', rate: 1000 },
      { particular: 'Door Handle + Lock', quantity: 8, unit: 'PCS', rate: 2500 },
      { particular: 'POP Ceiling', quantity: 1250, unit: 'SQ FEET', rate: 70 },
    ];

    const { calculatedItems, grandTotal } = calculateQuotationTotals(items);

    expect(calculatedItems[0].total).toBe(150000);
    expect(calculatedItems[1].total).toBe(20000);
    expect(calculatedItems[2].total).toBe(87500);
    expect(grandTotal).toBe(257500);
  });

  it('handles decimal quantities and rates safely with 2 decimal places', () => {
    const items = [
      { particular: 'Custom Edge Banding', quantity: 12.5, unit: 'SQ FEET', rate: 45.5 },
      { particular: 'Brass Screws Pack', quantity: 3, unit: 'PCS', rate: 199.99 },
    ];

    const { calculatedItems, grandTotal } = calculateQuotationTotals(items);

    // 12.5 * 45.5 = 568.75
    expect(calculatedItems[0].total).toBe(568.75);
    // 3 * 199.99 = 599.97
    expect(calculatedItems[1].total).toBe(599.97);
    expect(grandTotal).toBe(1168.72);
  });

  it('rejects unsupported units (only SQ FEET and PCS allowed)', () => {
    const invalidItems = [
      { particular: 'Wood Planks', quantity: 10, unit: 'METERS', rate: 500 },
    ];

    expect(() => calculateQuotationTotals(invalidItems)).toThrow(
      "Unit must be either 'SQ FEET' or 'PCS'"
    );
  });

  it('rejects zero or negative quantities', () => {
    expect(() =>
      calculateQuotationTotals([
        { particular: 'Wardrobe', quantity: 0, unit: 'PCS', rate: 1000 },
      ])
    ).toThrow('Quantity must be greater than zero');

    expect(() =>
      calculateQuotationTotals([
        { particular: 'Wardrobe', quantity: -5, unit: 'PCS', rate: 1000 },
      ])
    ).toThrow('Quantity must be greater than zero');
  });

  it('rejects negative rates', () => {
    expect(() =>
      calculateQuotationTotals([
        { particular: 'Wardrobe', quantity: 1, unit: 'PCS', rate: -500 },
      ])
    ).toThrow('Rate must be zero or greater');
  });

  it('formats dates in DD MMM YYYY format in Asia/Kolkata timezone', () => {
    const fixedDate = new Date('2026-11-09T10:00:00Z');
    const formatted = formatIndianDate(fixedDate);
    expect(formatted).toMatch(/^\d{2}\s[A-Z][a-z]{2}\s\d{4}$/);
    expect(formatted).toBe('09 Nov 2026');
  });
});

describe('Quotation Zod Validation Schemas', () => {
  it('validates a complete valid quotation creation payload', () => {
    const validData = {
      thekedar: {
        businessName: 'Sharma Interiors',
        phone: '9876543210',
      },
      customer: {
        name: 'Rajesh Gupta',
        phone: '9876500000',
        address: 'Flat 402, Green Heights, Andheri West, Mumbai',
      },
      items: [
        {
          particular: 'Kitchen Tandem',
          quantity: 150,
          unit: 'SQ FEET',
          rate: 1000,
        },
      ],
    };

    const parsed = createQuotationSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it('fails if customer name is missing', () => {
    const invalidData = {
      customer: { name: '   ' },
      items: [{ particular: 'Desk', quantity: 2, unit: 'PCS', rate: 3000 }],
    };

    const parsed = createQuotationSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });

  it('fails if items array is empty', () => {
    const invalidData = {
      customer: { name: 'Rajesh' },
      items: [],
    };

    const parsed = createQuotationSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });
});

describe('Quotation PDF Generation', () => {
  it('generates an authentic A4 PDF buffer containing PDF header %PDF-', async () => {
    const mockQuotation = {
      quotationNumber: 'FC-TK001-QTN-0001',
      thekedarCode: 'TK001',
      formattedDate: '09 Nov 2026',
      thekedar: {
        businessName: 'Sharma Woodcraft Works',
        phone: '9876543210',
      },
      customer: {
        name: 'Amit Verma',
        phone: '9812345678',
        address: 'Sector 62, Noida, UP',
      },
      items: [
        {
          particular: 'Custom 4-door wardrobe with hydraulic hinges and acrylic finish',
          quantity: 120,
          unit: 'SQ FEET',
          rate: 1450,
          total: 174000,
        },
        {
          particular: 'Sleek floating TV console with concealed wire conduit',
          quantity: 1,
          unit: 'PCS',
          rate: 22000,
          total: 22000,
        },
      ],
      grandTotal: 196000,
      termsAndConditions: [
        'All work will be done as per the agreed design, size, and details.',
        'Materials, colours, and fittings will be used as agreed with the customer.',
        'Any extra work or changes will cost extra.',
        'Extra charges will be discussed with the customer before starting the work.',
        'Payments must be made as agreed between the customer and the contractor.',
      ],
      status: 'DRAFT',
    };

    const pdfBuffer = await generateQuotationPdfBuffer(mockQuotation);
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    // PDF magic bytes %PDF-
    const headerStr = pdfBuffer.slice(0, 5).toString('ascii');
    expect(headerStr).toBe('%PDF-');
  });

  it('handles multi-page quotation with 20+ items cleanly without crashing', async () => {
    const items = [];
    for (let i = 1; i <= 25; i++) {
      items.push({
        particular: `Custom Modular Cabinet Unit #${i} with soft-close hardware, laminated finish, and internal led lighting`,
        quantity: i * 2,
        unit: i % 2 === 0 ? 'PCS' : 'SQ FEET',
        rate: 500 + i * 50,
        total: (i * 2) * (500 + i * 50),
      });
    }

    const mockQuotation = {
      quotationNumber: 'FC-TK002-QTN-0005',
      thekedarCode: 'TK002',
      formattedDate: '09 Nov 2026',
      thekedar: {
        businessName: 'Elite Furniture Studio',
        phone: '9988776655',
      },
      customer: {
        name: 'Vikas Malhotra',
        phone: '9123456780',
        address: 'B-104, Palm Springs, Gurgaon',
      },
      items,
      grandTotal: items.reduce((s, it) => s + it.total, 0),
      termsAndConditions: [
        'All work will be done as per the agreed design, size, and details.',
        'Materials, colours, and fittings will be used as agreed with the customer.',
        'Any extra work or changes will cost extra.',
        'Extra charges will be discussed with the customer before starting the work.',
        'Payments must be made as agreed between the customer and the contractor.',
      ],
      status: 'SENT',
    };

    const pdfBuffer = await generateQuotationPdfBuffer(mockQuotation);
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(5000);
    expect(pdfBuffer.slice(0, 5).toString('ascii')).toBe('%PDF-');
  });
});
