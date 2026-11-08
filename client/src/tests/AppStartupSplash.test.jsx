import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppStartupSplash } from '../components/common/AppStartupSplash';

describe('AppStartupSplash Component — Mobile & Desktop Native Start Loading', () => {
  it('renders startup splash with accessible status role and aria-label', () => {
    render(<AppStartupSplash />);
    const splash = screen.getByRole('status', { name: /Loading FurniCraft ERP workspace/i });
    expect(splash).toBeInTheDocument();
  });

  it('renders official brand name and ERP badge', () => {
    render(<AppStartupSplash />);
    expect(screen.getByText('Furni')).toBeInTheDocument();
    expect(screen.getByText('Craft')).toBeInTheDocument();
    expect(screen.getByText('ERP')).toBeInTheDocument();
  });

  it('renders the official signature logo image', () => {
    render(<AppStartupSplash />);
    const logoImg = screen.getByAltText('FurniCraft Logo');
    expect(logoImg).toBeInTheDocument();
    expect(logoImg.getAttribute('src')).toBe('/furnicraft-logo.png');
  });

  it('displays the brand tagline and starting status text', () => {
    render(<AppStartupSplash />);
    expect(screen.getByText(/Furniture Workforce Management Platform/i)).toBeInTheDocument();
    expect(screen.getByText(/Starting workspace\.\.\./i)).toBeInTheDocument();
    expect(screen.getByText(/Crafted for Furniture Workshops & Contractors/i)).toBeInTheDocument();
  });
});
