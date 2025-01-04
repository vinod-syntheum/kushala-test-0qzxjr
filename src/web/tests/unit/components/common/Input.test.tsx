import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, jest } from '@jest/globals';
import Input from '../../../../src/components/common/Input';

// Test constants
const TEST_INPUT_ID = 'test-input';
const TEST_INPUT_NAME = 'test-field';
const TEST_INPUT_VALUE = 'test value';
const TEST_ERROR_MESSAGE = 'This field is required';
const TEST_VALID_EMAIL = 'test@example.com';
const TEST_INVALID_EMAIL = 'invalid-email';
const TEST_PASSWORD = 'Password123!';
const TEST_LONG_TEXT = 'This is a very long input value that exceeds typical input lengths';

describe('Input Component', () => {
  // Basic rendering tests
  test('renders with required props', () => {
    const handleChange = jest.fn();
    render(
      <Input
        id={TEST_INPUT_ID}
        name={TEST_INPUT_NAME}
        type="text"
        value=""
        onChange={handleChange}
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', TEST_INPUT_ID);
    expect(input).toHaveAttribute('name', TEST_INPUT_NAME);
  });

  // Design system compliance tests
  test('renders with design system typography and spacing', () => {
    const handleChange = jest.fn();
    const { container } = render(
      <Input
        id={TEST_INPUT_ID}
        name={TEST_INPUT_NAME}
        type="text"
        value=""
        onChange={handleChange}
        label="Test Label"
      />
    );

    const label = screen.getByText('Test Label');
    expect(label).toHaveClass('text-sm', 'font-medium', 'text-gray-700', 'mb-1');
    expect(container.firstChild).toHaveClass('relative');
  });

  // Validation state tests
  test('displays error state correctly', () => {
    const handleChange = jest.fn();
    render(
      <Input
        id={TEST_INPUT_ID}
        name={TEST_INPUT_NAME}
        type="text"
        value=""
        onChange={handleChange}
        error={TEST_ERROR_MESSAGE}
        required
      />
    );

    const input = screen.getByRole('textbox');
    const errorMessage = screen.getByText(TEST_ERROR_MESSAGE);
    
    expect(input).toHaveClass('border-red-500');
    expect(errorMessage).toHaveClass('text-red-600');
    expect(errorMessage).toHaveAttribute('role', 'alert');
  });

  test('displays valid state for required fields with value', () => {
    const handleChange = jest.fn();
    render(
      <Input
        id={TEST_INPUT_ID}
        name={TEST_INPUT_NAME}
        type="text"
        value={TEST_INPUT_VALUE}
        onChange={handleChange}
        required
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-green-500');
  });

  // Accessibility tests
  test('implements proper accessibility attributes', () => {
    const handleChange = jest.fn();
    render(
      <Input
        id={TEST_INPUT_ID}
        name={TEST_INPUT_NAME}
        type="text"
        value=""
        onChange={handleChange}
        required
        aria-label="Test input"
        helperText="Helper text"
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(input).toHaveAttribute('aria-label', 'Test input');
  });

  // Event handling tests
  test('handles change events correctly', async () => {
    const handleChange = jest.fn();
    const user = userEvent.setup();
    
    render(
      <Input
        id={TEST_INPUT_ID}
        name={TEST_INPUT_NAME}
        type="text"
        value=""
        onChange={handleChange}
      />
    );

    const input = screen.getByRole('textbox');
    await user.type(input, TEST_INPUT_VALUE);
    
    expect(handleChange).toHaveBeenCalledTimes(TEST_INPUT_VALUE.length);
  });

  test('handles blur events correctly', async () => {
    const handleBlur = jest.fn();
    const handleChange = jest.fn();
    
    render(
      <Input
        id={TEST_INPUT_ID}
        name={TEST_INPUT_NAME}
        type="text"
        value=""
        onChange={handleChange}
        onBlur={handleBlur}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.blur(input);
    
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  // Input type specific tests
  test('handles email input type correctly', async () => {
    const handleChange = jest.fn();
    const user = userEvent.setup();
    
    render(
      <Input
        id={TEST_INPUT_ID}
        name={TEST_INPUT_NAME}
        type="email"
        value=""
        onChange={handleChange}
      />
    );

    const input = screen.getByRole('textbox');
    await user.type(input, TEST_VALID_EMAIL);
    
    expect(input).toHaveAttribute('type', 'email');
    expect(handleChange).toHaveBeenCalledTimes(TEST_VALID_EMAIL.length);
  });

  test('handles password input type correctly', async () => {
    const handleChange = jest.fn();
    const user = userEvent.setup();
    
    render(
      <Input
        id={TEST_INPUT_ID}
        name={TEST_INPUT_NAME}
        type="password"
        value=""
        onChange={handleChange}
      />
    );

    const input = screen.getByRole('textbox', { hidden: true });
    await user.type(input, TEST_PASSWORD);
    
    expect(input).toHaveAttribute('type', 'password');
    expect(handleChange).toHaveBeenCalledTimes(TEST_PASSWORD.length);
  });

  // Disabled state tests
  test('handles disabled state correctly', () => {
    const handleChange = jest.fn();
    render(
      <Input
        id={TEST_INPUT_ID}
        name={TEST_INPUT_NAME}
        type="text"
        value=""
        onChange={handleChange}
        disabled
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('bg-gray-100', 'cursor-not-allowed', 'opacity-75');
  });

  // Helper text tests
  test('displays helper text when provided', () => {
    const handleChange = jest.fn();
    const helperText = 'This is helper text';
    
    render(
      <Input
        id={TEST_INPUT_ID}
        name={TEST_INPUT_NAME}
        type="text"
        value=""
        onChange={handleChange}
        helperText={helperText}
      />
    );

    const helperElement = screen.getByText(helperText);
    expect(helperElement).toHaveClass('text-sm', 'text-gray-500');
  });

  // Focus management tests
  test('focuses input on error', async () => {
    const handleChange = jest.fn();
    const { rerender } = render(
      <Input
        id={TEST_INPUT_ID}
        name={TEST_INPUT_NAME}
        type="text"
        value=""
        onChange={handleChange}
      />
    );

    const input = screen.getByRole('textbox');
    
    rerender(
      <Input
        id={TEST_INPUT_ID}
        name={TEST_INPUT_NAME}
        type="text"
        value=""
        onChange={handleChange}
        error={TEST_ERROR_MESSAGE}
      />
    );

    await waitFor(() => {
      expect(document.activeElement).toBe(input);
    });
  });
});