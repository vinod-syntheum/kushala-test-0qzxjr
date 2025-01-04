import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import LoginForm from '../../../../src/components/auth/LoginForm';
import { useAuth } from '../../../../src/hooks/useAuth';
import { HttpStatusCode } from '../../../../src/types/common';

// Mock the useAuth hook
jest.mock('../../../../src/hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

// Test constants
const TEST_CREDENTIALS = {
  valid: {
    email: 'test@example.com',
    password: 'ValidPass123!'
  },
  invalid: {
    email: 'invalid.email',
    password: 'weak'
  }
};

const VALIDATION_MESSAGES = {
  email: {
    required: 'Email is required',
    invalid: 'Please enter a valid email address'
  },
  password: {
    required: 'Password is required',
    invalid: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  }
};

describe('LoginForm', () => {
  // Setup user event instance
  const user = userEvent.setup();
  
  // Mock functions
  const mockLogin = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup default useAuth mock implementation
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      isLoading: false
    });
  });

  // Helper function to render component with Redux provider
  const renderLoginForm = () => {
    return render(
      <LoginForm
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );
  };

  describe('Form Rendering', () => {
    test('renders all form elements with correct attributes', () => {
      renderLoginForm();

      // Email input
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('aria-label', 'Email address');

      // Password input
      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('aria-label', 'Password');

      // Submit button
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
      expect(submitButton).not.toBeDisabled();
    });

    test('applies correct design system classes', () => {
      renderLoginForm();
      
      const form = screen.getByRole('form');
      expect(form).toHaveClass('space-y-6');

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      expect(emailInput.parentElement).toHaveClass('relative');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toHaveClass('w-full');
    });
  });

  describe('Form Validation', () => {
    test('shows validation errors for empty form submission', async () => {
      renderLoginForm();
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      expect(await screen.findByText(VALIDATION_MESSAGES.email.required)).toBeInTheDocument();
      expect(await screen.findByText(VALIDATION_MESSAGES.password.required)).toBeInTheDocument();
    });

    test('validates email format', async () => {
      renderLoginForm();
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      await user.type(emailInput, TEST_CREDENTIALS.invalid.email);
      await user.tab();

      expect(await screen.findByText(VALIDATION_MESSAGES.email.invalid)).toBeInTheDocument();
    });

    test('validates password requirements', async () => {
      renderLoginForm();
      
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, TEST_CREDENTIALS.invalid.password);
      await user.tab();

      expect(await screen.findByText(VALIDATION_MESSAGES.password.invalid)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    test('handles successful login', async () => {
      mockLogin.mockResolvedValueOnce({
        accessToken: 'mock-token',
        user: { id: '1', email: TEST_CREDENTIALS.valid.email }
      });

      renderLoginForm();
      
      // Fill form
      await user.type(screen.getByRole('textbox', { name: /email/i }), TEST_CREDENTIALS.valid.email);
      await user.type(screen.getByLabelText(/password/i), TEST_CREDENTIALS.valid.password);
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: TEST_CREDENTIALS.valid.email,
          password: TEST_CREDENTIALS.valid.password
        });
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    test('handles invalid credentials error', async () => {
      mockLogin.mockRejectedValueOnce({
        status: HttpStatusCode.UNAUTHORIZED,
        message: 'Invalid email or password'
      });

      renderLoginForm();
      
      // Fill and submit form
      await user.type(screen.getByRole('textbox', { name: /email/i }), TEST_CREDENTIALS.valid.email);
      await user.type(screen.getByLabelText(/password/i), TEST_CREDENTIALS.valid.password);
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalled();
    });

    test('shows loading state during submission', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        login: mockLogin,
        isLoading: true
      });

      renderLoginForm();
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Signing in...')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('supports keyboard navigation', async () => {
      renderLoginForm();
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Check tab order
      await user.tab();
      expect(emailInput).toHaveFocus();
      
      await user.tab();
      expect(passwordInput).toHaveFocus();
      
      await user.tab();
      expect(submitButton).toHaveFocus();
    });

    test('announces validation errors to screen readers', async () => {
      renderLoginForm();
      
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      const errorMessages = await screen.findAllByRole('alert');
      expect(errorMessages).toHaveLength(2);
      expect(errorMessages[0]).toHaveTextContent(VALIDATION_MESSAGES.email.required);
    });

    test('handles rate limiting lockout', async () => {
      mockLogin.mockRejectedValue({ status: HttpStatusCode.UNAUTHORIZED });
      renderLoginForm();

      // Attempt multiple failed logins
      for (let i = 0; i < 5; i++) {
        await user.type(screen.getByRole('textbox', { name: /email/i }), TEST_CREDENTIALS.valid.email);
        await user.type(screen.getByLabelText(/password/i), TEST_CREDENTIALS.valid.password);
        await user.click(screen.getByRole('button', { name: /sign in/i }));
      }

      expect(await screen.findByText(/account temporarily locked/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
    });
  });
});