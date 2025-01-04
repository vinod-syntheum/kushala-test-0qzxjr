import React, { useEffect, useState } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useForm } from '../../hooks/useForm';
import { validatePassword } from '../../utils/validation';
import { ValidationError } from '../../types/common';

interface ResetPasswordFormProps {
  token: string;
  onSubmit: (values: ResetPasswordValues) => Promise<void>;
  maxAttempts: number;
  onMaxAttemptsReached: () => void;
}

interface ResetPasswordValues {
  password: string;
  confirmPassword: string;
  passwordStrength: number;
  attemptCount: number;
}

const initialValues: ResetPasswordValues = {
  password: '',
  confirmPassword: '',
  passwordStrength: 0,
  attemptCount: 0
};

const validateForm = (values: ResetPasswordValues): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Password validation
  const passwordErrors = validatePassword(values.password);
  errors.push(...passwordErrors);

  // Confirm password validation
  if (values.password !== values.confirmPassword) {
    errors.push({
      field: 'confirmPassword',
      message: 'Passwords do not match',
      code: 'PASSWORD_MISMATCH'
    });
  }

  // Password strength validation
  if (values.passwordStrength < 70) {
    errors.push({
      field: 'password',
      message: 'Please choose a stronger password',
      code: 'WEAK_PASSWORD'
    });
  }

  return errors;
};

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  token,
  onSubmit,
  maxAttempts,
  onMaxAttemptsReached
}) => {
  const [isTokenValid, setIsTokenValid] = useState(true);

  const {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue
  } = useForm<ResetPasswordValues>({
    initialValues,
    validateFn: validateForm,
    onSubmit: async (formValues) => {
      if (formValues.attemptCount >= maxAttempts) {
        onMaxAttemptsReached();
        return;
      }

      try {
        await onSubmit(formValues);
      } catch (error) {
        setFieldValue('attemptCount', values.attemptCount + 1);
        if (values.attemptCount + 1 >= maxAttempts) {
          onMaxAttemptsReached();
        }
      }
    },
    validationOptions: {
      validateOnChange: true,
      validateOnBlur: true,
      debounceMs: 300
    },
    securityOptions: {
      enableXssPrevention: true,
      maxFieldLength: 64,
      allowedTags: []
    }
  });

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      // Token validation would typically be handled by your auth service
      // For now, we'll just check if it exists
      setIsTokenValid(Boolean(token));
    };

    validateToken();
  }, [token]);

  if (!isTokenValid) {
    return (
      <div role="alert" className="text-red-600 text-center p-4">
        Invalid or expired password reset token. Please request a new password reset link.
      </div>
    );
  }

  const getPasswordStrengthColor = (strength: number): string => {
    if (strength >= 80) return 'bg-green-500';
    if (strength >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-w-md mx-auto"
      noValidate
      aria-label="Password reset form"
    >
      <div className="space-y-4">
        <Input
          id="password"
          name="password"
          type="password"
          value={values.password}
          onChange={(e) => {
            handleChange('password', e.target.value);
            // Calculate password strength when password changes
            const strength = validatePassword(e.target.value).length === 0 ? 100 : 0;
            setFieldValue('passwordStrength', strength);
          }}
          onBlur={() => handleBlur('password')}
          label="New Password"
          error={errors.find(e => e.field === 'password')?.message}
          required
          aria-describedby="password-requirements"
          autoComplete="new-password"
        />

        {/* Password strength indicator */}
        <div className="mt-2">
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getPasswordStrengthColor(values.passwordStrength)}`}
              style={{ width: `${values.passwordStrength}%` }}
              role="progressbar"
              aria-valuenow={values.passwordStrength}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Password strength"
            />
          </div>
          <p id="password-requirements" className="text-sm text-gray-600 mt-1">
            Password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters.
          </p>
        </div>

        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={values.confirmPassword}
          onChange={(e) => handleChange('confirmPassword', e.target.value)}
          onBlur={() => handleBlur('confirmPassword')}
          label="Confirm Password"
          error={errors.find(e => e.field === 'confirmPassword')?.message}
          required
          autoComplete="new-password"
        />
      </div>

      {values.attemptCount > 0 && (
        <p className="text-sm text-yellow-600" role="alert">
          Attempts remaining: {maxAttempts - values.attemptCount}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        fullWidth
        loading={isSubmitting}
        disabled={errors.length > 0 || isSubmitting || values.attemptCount >= maxAttempts}
        ariaLabel="Reset password"
      >
        Reset Password
      </Button>
    </form>
  );
};

export default React.memo(ResetPasswordForm);