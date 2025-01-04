import React, { useState, useCallback } from 'react';
import validator from 'validator'; // v13.0.0
import { useForm } from '../../hooks/useForm';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useToast } from '../../hooks/useToast';
import { api } from '../../lib/api';
import { ValidationError } from '../../types/common';

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
};

interface ForgotPasswordFormProps {
  onSuccess: () => void;
  className?: string;
}

interface ForgotPasswordFormValues {
  email: string;
}

/**
 * Validates the forgot password form input with enhanced security checks
 */
const validateForm = (values: ForgotPasswordFormValues): ValidationError[] => {
  const errors: ValidationError[] = [];
  const sanitizedEmail = validator.trim(validator.escape(values.email));

  if (!sanitizedEmail) {
    errors.push({
      field: 'email',
      message: 'Email is required',
      code: 'REQUIRED',
    });
  } else if (!validator.isEmail(sanitizedEmail, { allow_utf8_local_part: false })) {
    errors.push({
      field: 'email',
      message: 'Please enter a valid email address',
      code: 'INVALID_FORMAT',
    });
  } else if (sanitizedEmail.length > 254) { // RFC 5321 length limit
    errors.push({
      field: 'email',
      message: 'Email address is too long',
      code: 'MAX_LENGTH',
    });
  }

  return errors;
};

/**
 * Enhanced form component for secure password reset requests with comprehensive
 * validation, rate limiting, and accessibility support.
 */
export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSuccess,
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const { show: showToast } = useToast();

  const {
    values,
    errors,
    handleChange,
    handleSubmit,
    touched,
  } = useForm<ForgotPasswordFormValues>({
    initialValues: { email: '' },
    validateFn: validateForm,
    onSubmit: async (formValues) => {
      if (attempts >= RATE_LIMIT.MAX_ATTEMPTS) {
        showToast({
          variant: 'error',
          message: 'Too many attempts. Please try again later.',
          duration: 5000,
        });
        return;
      }

      setIsLoading(true);
      setAttempts((prev) => prev + 1);

      try {
        await api.post('/auth/forgot-password', {
          email: validator.normalizeEmail(formValues.email, {
            gmail_remove_dots: false,
            all_lowercase: true,
          }),
        });

        showToast({
          variant: 'success',
          message: 'If an account exists with this email, you will receive password reset instructions.',
          duration: 5000,
        });

        onSuccess();
      } catch (error) {
        // Don't reveal whether the email exists or not
        showToast({
          variant: 'success',
          message: 'If an account exists with this email, you will receive password reset instructions.',
          duration: 5000,
        });

        // Log the error for monitoring but don't expose to user
        console.error('Password reset request failed:', error);
      } finally {
        setIsLoading(false);
      }
    },
  });

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSubmit(e);
    },
    [handleSubmit]
  );

  return (
    <form
      onSubmit={handleFormSubmit}
      className={`space-y-6 ${className}`}
      noValidate
      aria-label="Password reset request form"
    >
      <Input
        id="email"
        name="email"
        type="email"
        value={values.email}
        onChange={(e) => handleChange('email', e.target.value)}
        error={touched.email ? errors.find((e) => e.field === 'email')?.message : undefined}
        label="Email address"
        placeholder="Enter your email address"
        required
        disabled={isLoading || attempts >= RATE_LIMIT.MAX_ATTEMPTS}
        aria-describedby="email-description"
        autoComplete="email"
        spellCheck={false}
        className="w-full"
      />

      <div id="email-description" className="text-sm text-gray-500">
        Enter the email address associated with your account and we'll send you instructions
        to reset your password.
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isLoading}
        disabled={isLoading || attempts >= RATE_LIMIT.MAX_ATTEMPTS}
        aria-label="Request password reset"
      >
        Send Reset Instructions
      </Button>

      {attempts > 0 && attempts < RATE_LIMIT.MAX_ATTEMPTS && (
        <div className="text-sm text-gray-500 text-center">
          Attempts remaining: {RATE_LIMIT.MAX_ATTEMPTS - attempts}
        </div>
      )}
    </form>
  );
};

export default ForgotPasswordForm;