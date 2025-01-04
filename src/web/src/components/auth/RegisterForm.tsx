import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/router'; // v14.0.0
import { z } from 'zod'; // v3.0.0
import { useDebounce } from 'use-debounce'; // v9.0.0
import { useForm } from '../../hooks/useForm';
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';
import Input from '../common/Input';
import { ValidationError } from '../../types/common';

// Registration form validation schema
const registerSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(64, 'Password cannot exceed 64 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number and special character'
    ),
  confirmPassword: z.string()
    .min(1, 'Please confirm your password'),
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s-']+$/, 'First name can only contain letters, spaces, hyphens and apostrophes'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s-']+$/, 'Last name can only contain letters, spaces, hyphens and apostrophes'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export interface RegisterFormProps {
  onSuccess?: () => void;
  className?: string;
  redirectUrl?: string;
}

export interface RegisterFormValues {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

const initialValues: RegisterFormValues = {
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
};

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  className = '',
  redirectUrl = '/dashboard',
}) => {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  // Validate form values using Zod schema
  const validateForm = useCallback((values: RegisterFormValues): ValidationError[] => {
    try {
      registerSchema.parse(values);
      return [];
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: 'VALIDATION_ERROR'
        }));
      }
      return [];
    }
  }, []);

  // Handle form submission with security measures
  const handleSubmit = useCallback(async (values: RegisterFormValues) => {
    try {
      setServerError(null);
      
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...registrationData } = values;
      
      await register(registrationData);
      
      if (onSuccess) {
        onSuccess();
      }
      
      router.push(redirectUrl);
    } catch (error: any) {
      setServerError(error.message || 'Registration failed. Please try again.');
    }
  }, [register, onSuccess, router, redirectUrl]);

  const {
    values,
    errors,
    handleChange,
    handleBlur,
    handleSubmit: onSubmit,
    isSubmitting,
  } = useForm({
    initialValues,
    validateFn: validateForm,
    onSubmit: handleSubmit,
    validationOptions: {
      validateOnChange: true,
      validateOnBlur: true,
      debounceMs: 300
    },
    securityOptions: {
      enableXssPrevention: true,
      maxFieldLength: 100,
      allowedTags: []
    }
  });

  // Debounce error display for better UX
  const [debouncedErrors] = useDebounce(errors, 300);

  return (
    <form 
      onSubmit={onSubmit}
      className={`space-y-6 ${className}`}
      noValidate
    >
      {serverError && (
        <div 
          className="p-4 bg-red-50 border border-red-200 rounded-md"
          role="alert"
        >
          <p className="text-sm text-red-600">{serverError}</p>
        </div>
      )}

      <Input
        id="firstName"
        name="firstName"
        type="text"
        label="First Name"
        value={values.firstName}
        onChange={handleChange}
        onBlur={handleBlur}
        error={debouncedErrors.find(e => e.field === 'firstName')?.message}
        required
        autoComplete="given-name"
        aria-label="First Name"
      />

      <Input
        id="lastName"
        name="lastName"
        type="text"
        label="Last Name"
        value={values.lastName}
        onChange={handleChange}
        onBlur={handleBlur}
        error={debouncedErrors.find(e => e.field === 'lastName')?.message}
        required
        autoComplete="family-name"
        aria-label="Last Name"
      />

      <Input
        id="email"
        name="email"
        type="email"
        label="Email Address"
        value={values.email}
        onChange={handleChange}
        onBlur={handleBlur}
        error={debouncedErrors.find(e => e.field === 'email')?.message}
        required
        autoComplete="email"
        aria-label="Email Address"
      />

      <Input
        id="password"
        name="password"
        type="password"
        label="Password"
        value={values.password}
        onChange={handleChange}
        onBlur={handleBlur}
        error={debouncedErrors.find(e => e.field === 'password')?.message}
        required
        autoComplete="new-password"
        aria-label="Password"
        helperText="Must contain at least 8 characters, including uppercase, lowercase, number and special character"
      />

      <Input
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        label="Confirm Password"
        value={values.confirmPassword}
        onChange={handleChange}
        onBlur={handleBlur}
        error={debouncedErrors.find(e => e.field === 'confirmPassword')?.message}
        required
        autoComplete="new-password"
        aria-label="Confirm Password"
      />

      <Button
        type="submit"
        variant="primary"
        fullWidth
        loading={isSubmitting || isLoading}
        disabled={isSubmitting || isLoading || errors.length > 0}
        aria-label="Create Account"
      >
        Create Account
      </Button>
    </form>
  );
};

export default RegisterForm;