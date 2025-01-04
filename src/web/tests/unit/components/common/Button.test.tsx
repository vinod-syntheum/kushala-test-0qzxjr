import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react'; // v14.0.0
import userEvent from '@testing-library/user-event'; // v14.0.0
import '@testing-library/jest-dom/extend-expect'; // v6.0.0

import { Button, ButtonProps } from '@/components/common/Button';

describe('Button Component', () => {
  const defaultProps: ButtonProps = {
    children: 'Test Button',
    onClick: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<Button>{defaultProps.children}</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders children correctly', () => {
      render(
        <Button>
          <span>Complex</span>
          <span>Content</span>
        </Button>
      );
      expect(screen.getByText('Complex')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(
        <Button className="custom-class">{defaultProps.children}</Button>
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('maintains proper content order with loading state', () => {
      const { rerender } = render(<Button {...defaultProps} />);
      expect(screen.getByText('Test Button')).toBeInTheDocument();

      rerender(<Button {...defaultProps} loading />);
      expect(screen.getByText('Loading')).toBeInTheDocument();
      expect(screen.queryByText('Test Button')).not.toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    const variants: Array<ButtonProps['variant']> = ['primary', 'secondary', 'outline', 'text'];

    variants.forEach((variant) => {
      it(`applies correct classes for ${variant} variant`, () => {
        render(
          <Button {...defaultProps} variant={variant} />
        );
        const button = screen.getByRole('button');
        
        // Check for variant-specific classes
        const variantClassMap = {
          primary: 'bg-accent-color',
          secondary: 'bg-secondary-color',
          outline: 'border-2 border-accent-color',
          text: 'text-accent-color'
        };
        expect(button).toHaveClass(variantClassMap[variant!]);
      });
    });

    it('defaults to primary variant when not specified', () => {
      render(<Button {...defaultProps} />);
      expect(screen.getByRole('button')).toHaveClass('bg-accent-color');
    });
  });

  describe('Sizes', () => {
    const sizes: Array<ButtonProps['size']> = ['sm', 'md', 'lg'];

    sizes.forEach((size) => {
      it(`applies correct classes for ${size} size`, () => {
        render(
          <Button {...defaultProps} size={size} />
        );
        const button = screen.getByRole('button');
        
        // Check for size-specific classes
        const sizeClassMap = {
          sm: 'min-h-[32px]',
          md: 'min-h-[40px]',
          lg: 'min-h-[48px]'
        };
        expect(button).toHaveClass(sizeClassMap[size!]);
      });
    });

    it('handles fullWidth prop correctly', () => {
      render(<Button {...defaultProps} fullWidth />);
      expect(screen.getByRole('button')).toHaveClass('w-full');
    });
  });

  describe('States', () => {
    it('handles disabled state correctly', () => {
      render(<Button {...defaultProps} disabled />);
      const button = screen.getByRole('button');
      
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
      
      fireEvent.click(button);
      expect(defaultProps.onClick).not.toHaveBeenCalled();
    });

    it('handles loading state correctly', () => {
      render(<Button {...defaultProps} loading />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveClass('cursor-wait');
      expect(screen.getByText('Loading')).toBeInTheDocument();
      
      fireEvent.click(button);
      expect(defaultProps.onClick).not.toHaveBeenCalled();
    });

    it('handles click events when enabled', async () => {
      const user = userEvent.setup();
      render(<Button {...defaultProps} />);
      
      await user.click(screen.getByRole('button'));
      expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('supports custom aria-label', () => {
      render(
        <Button {...defaultProps} ariaLabel="Custom Label" />
      );
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Custom Label');
    });

    it('supports custom aria-describedby', () => {
      render(
        <Button {...defaultProps} ariaDescribedBy="description-id" />
      );
      expect(screen.getByRole('button')).toHaveAttribute('aria-describedby', 'description-id');
    });

    it('announces loading state to screen readers', () => {
      render(<Button {...defaultProps} loading />);
      expect(screen.getByText('Loading')).toHaveClass('sr-only');
    });

    it('maintains focus styles', () => {
      render(<Button {...defaultProps} />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-2');
    });
  });

  describe('Performance', () => {
    it('uses GPU acceleration for transitions', () => {
      render(<Button {...defaultProps} />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('transform-gpu');
      expect(button).toHaveStyle({ willChange: 'transform' });
    });

    it('applies transition classes correctly', () => {
      render(<Button {...defaultProps} />);
      expect(screen.getByRole('button')).toHaveClass('transition-colors');
    });
  });

  describe('Type Attribute', () => {
    const types: Array<ButtonProps['type']> = ['button', 'submit', 'reset'];

    types.forEach((type) => {
      it(`sets correct type attribute for ${type}`, () => {
        render(<Button {...defaultProps} type={type} />);
        expect(screen.getByRole('button')).toHaveAttribute('type', type);
      });
    });

    it('defaults to button type when not specified', () => {
      render(<Button {...defaultProps} />);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });
  });
});