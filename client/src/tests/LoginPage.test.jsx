import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { LoginPage } from '../pages/LoginPage';
import api from '../api/client';

describe('LoginPage Component', () => {
  it('renders clean login form with essential inputs and Register as Thekedar', () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('yourname@gmail.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to Dashboard/i })).toBeInTheDocument();
    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
    expect(screen.getByText('Register as Thekedar')).toBeInTheDocument();

    // Verify demo login section and right showcase are NOT rendered
    expect(screen.queryByText(/Instant Demo Login/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Contractor Command Center/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Modern Furniture & Workshop Workforce System/i)).not.toBeInTheDocument();
  });

  it('toggles password visibility when show/hide button is clicked', () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </AuthProvider>
    );

    const passwordInput = screen.getByPlaceholderText('••••••••••••');
    expect(passwordInput.type).toBe('password');

    const toggleBtn = screen.getByRole('button', { name: /Show password/i });
    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe('text');

    const hideBtn = screen.getByRole('button', { name: /Hide password/i });
    fireEvent.click(hideBtn);
    expect(passwordInput.type).toBe('password');
  });

  it('opens Email OTP recovery modal when clicking Forgot password?', () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </AuthProvider>
    );

    const forgotBtn = screen.getByText('Forgot password?');
    fireEvent.click(forgotBtn);

    expect(screen.getByText('Password Reset via Email OTP')).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 3: Enter Registered Email Address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send 6-Digit OTP/i })).toBeInTheDocument();
  });

  it('displays warning when unregistered email is submitted in forgot password modal', async () => {
    vi.spyOn(api, 'post').mockRejectedValueOnce(
      new Error('This email address is not registered with FurniCraft. Please provide a valid registered email address.')
    );

    render(
      <AuthProvider>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Forgot password?'));

    const emailInput = screen.getByPlaceholderText('e.g. yourname@gmail.com');
    fireEvent.change(emailInput, { target: { value: 'unregistered@test.com' } });

    fireEvent.click(screen.getByRole('button', { name: /Send 6-Digit OTP/i }));

    const warning = await screen.findByText(/This email address is not registered with FurniCraft/i);
    expect(warning).toBeInTheDocument();
    expect(screen.getByText('Unregistered Email Warning')).toBeInTheDocument();
  });
});
