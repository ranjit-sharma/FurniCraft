import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QuotationsPage } from '../pages/QuotationsPage';
import { LanguageProvider } from '../context/LanguageContext';
import { ThemeProvider } from '../context/ThemeContext';
import api from '../api/client';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      _id: 'thekedar_101',
      name: 'Ranjit Sharma',
      role: 'THEKEDAR',
      email: 'thekedar@test.com',
      phone: '9876543210',
      businessName: 'Sharma Modular Kitchens',
      thekedarCode: 'TK001',
      preferredLanguage: 'en',
    },
    isOwner: false,
    isThekedar: true,
    isWorker: false,
    loading: false,
  }),
  AuthProvider: ({ children }) => <>{children}</>,
}));

describe('QuotationsPage Frontend Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url.includes('/quotations/initial-data')) {
        return Promise.resolve({
          data: {
            data: {
              thekedar: {
                businessName: 'Sharma Modular Kitchens',
                phone: '9876543210',
                thekedarCode: 'TK001',
              },
              currentDate: '09 Nov 2026',
              defaultTerms: [
                'All work will be done as per the agreed design, size, and details.',
                'Materials, colours, and fittings will be used as agreed with the customer.',
                'Any extra work or changes will cost extra.',
                'Extra charges will be discussed with the customer before starting the work.',
                'Payments must be made as agreed between the customer and the contractor.',
              ],
            },
          },
        });
      }

      if (url === '/quotations' || url.startsWith('/quotations?')) {
        return Promise.resolve({
          data: {
            data: {
              quotations: [
                {
                  _id: 'qtn_1',
                  quotationNumber: 'FC-TK001-QTN-0001',
                  formattedDate: '09 Nov 2026',
                  customer: { name: 'Rajesh Gupta', phone: '9812345678' },
                  project: { name: '3BHK Modular Kitchen' },
                  grandTotal: 257500,
                  items: [
                    { particular: 'Kitchen Tandem', quantity: 150, unit: 'SQ FEET', rate: 1000, total: 150000 },
                  ],
                  status: 'DRAFT',
                },
              ],
              pagination: { page: 1, limit: 15, total: 1, totalPages: 1 },
            },
          },
        });
      }

      return Promise.resolve({ data: {} });
    });
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <ThemeProvider>
          <LanguageProvider>
            <QuotationsPage />
          </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
    );

  it('renders Quotations Management history list with existing quotation card', async () => {
    renderComponent();

    expect(await screen.findByText('Quotations Management')).toBeInTheDocument();
    expect(await screen.findByText('FC-TK001-QTN-0001')).toBeInTheDocument();
    expect(screen.getByText('Rajesh Gupta')).toBeInTheDocument();
    expect(screen.getByText('₹2,57,500')).toBeInTheDocument();
    // Project info is completely removed from quotation cards
    expect(screen.queryByText('3BHK Modular Kitchen')).toBeNull();
  });

  it('switches to create form on clicking Create Quotation button', async () => {
    renderComponent();

    const createBtn = await screen.findByRole('button', { name: /Create Quotation/i });
    fireEvent.click(createBtn);

    expect(await screen.findByText('Create New Quotation')).toBeInTheDocument();
    expect(screen.getByText('A. Thekedar Information')).toBeInTheDocument();
    expect(screen.getByText('B. Customer Information')).toBeInTheDocument();
    expect(screen.getByText('C. Quotation Items')).toBeInTheDocument();
    expect(screen.queryByText(/Project Information/i)).toBeNull();
  });

  it('strictly omits Project Information section and Project Name fields from form', async () => {
    renderComponent();

    const createBtn = await screen.findByRole('button', { name: /Create Quotation/i });
    fireEvent.click(createBtn);

    // Project Name must NOT be in the form
    expect(screen.queryByLabelText(/Project Name/i)).toBeNull();
    expect(screen.queryByPlaceholderText(/3BHK Modular/i)).toBeNull();
    expect(screen.queryByText(/Project Information/i)).toBeNull();
  });

  it('supports strictly only SQ FEET and PCS units in the unit selector', async () => {
    renderComponent();

    const createBtn = await screen.findByRole('button', { name: /Create Quotation/i });
    fireEvent.click(createBtn);

    const unitSelect = await screen.findByRole('combobox');
    const options = Array.from(unitSelect.querySelectorAll('option')).map((o) => o.value);

    expect(options).toEqual(['SQ FEET', 'PCS']);
    expect(options).toHaveLength(2);
  });

  it('performs live calculation of item total and Grand Total when qty or rate changes', async () => {
    renderComponent();

    const createBtn = await screen.findByRole('button', { name: /Create Quotation/i });
    fireEvent.click(createBtn);

    // Initial qty is 1, rate is 0 -> grand total 0
    expect(screen.getByText('GRAND TOTAL')).toBeInTheDocument();

    // Fill Particular
    const particularInput = screen.getByPlaceholderText(/e\.g\. Kitchen Tandem/i);
    fireEvent.change(particularInput, { target: { value: 'Wardrobe Shutter' } });

    // Change Quantity to 150
    const qtyInputs = screen.getAllByRole('spinbutton');
    const qtyInput = qtyInputs[0]; // first number input is quantity
    const rateInput = qtyInputs[1]; // second number input is rate

    fireEvent.change(qtyInput, { target: { value: '150' } });
    fireEvent.change(rateInput, { target: { value: '1000' } });

    // 150 * 1000 = 150,000
    await waitFor(() => {
      expect(screen.getAllByText('₹1,50,000')).toHaveLength(2); // once in row total, once in Grand Total
    });
  });

  it('displays exactly the 5 finalized Terms & Conditions in simple English', async () => {
    renderComponent();

    const createBtn = await screen.findByRole('button', { name: /Create Quotation/i });
    fireEvent.click(createBtn);

    expect(
      await screen.findByText('All work will be done as per the agreed design, size, and details.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Materials, colours, and fittings will be used as agreed with the customer.')
    ).toBeInTheDocument();
    expect(screen.getByText('Any extra work or changes will cost extra.')).toBeInTheDocument();
    expect(
      screen.getByText('Extra charges will be discussed with the customer before starting the work.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Payments must be made as agreed between the customer and the contractor.')
    ).toBeInTheDocument();

    // Ensure NO notes or specifications header
    expect(screen.queryByText(/Notes \/ Specifications/i)).toBeNull();
  });

  it('provides a Preview button on the quotation card and omits status badge and duplicate button', async () => {
    renderComponent();

    // Verify card rendered
    expect(await screen.findByText('FC-TK001-QTN-0001')).toBeInTheDocument();

    // Status tag should not be rendered on the card
    expect(screen.queryByText('DRAFT')).toBeNull();

    // Duplicate button should not be present
    expect(screen.queryByTitle(/Duplicate/i)).toBeNull();

    // Preview button should be present on the card
    const previewBtn = screen.getByTitle('Preview Quotation');
    expect(previewBtn).toBeInTheDocument();

    // Clicking Preview opens the Preview Modal
    fireEvent.click(previewBtn);
    expect(await screen.findByText('Quotation Preview')).toBeInTheDocument();
    expect(screen.getAllByText('Rajesh Gupta').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('DIGITALLY SIGNED')).toBeInTheDocument();
    expect(screen.getByText('Authorized Digital Signature')).toBeInTheDocument();
    // No "For" prefix in signature block
    expect(screen.queryByText(/For Sharma Modular Kitchens/i)).toBeNull();
    // No Project card in preview modal
    expect(screen.queryByText('PROJECT')).toBeNull();
  });
});
