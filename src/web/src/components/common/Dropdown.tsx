import React, { useCallback, useEffect, useRef, useState } from 'react'; // v18.0.0
import classNames from 'classnames'; // v2.3.2
import { useVirtualizer } from 'react-virtual'; // v2.10.4
import { useDebounce } from 'use-debounce'; // v9.0.0
import { DeviceType } from '../../utils/responsive';

// Interfaces
interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownStyles {
  container?: string;
  control?: string;
  menu?: string;
  option?: string;
  searchInput?: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  isMulti?: boolean;
  isSearchable?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
  className?: string;
  customStyles?: DropdownStyles;
  'aria-label'?: string;
  testId?: string;
}

// Custom hooks
const useClickOutside = (handler: () => void) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handler]);

  return ref;
};

const useKeyboardNavigation = (
  options: DropdownOption[],
  isOpen: boolean,
  onSelect: (option: DropdownOption) => void,
  onClose: () => void
) => {
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => 
            prev < options.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (activeIndex >= 0 && !options[activeIndex].disabled) {
            onSelect(options[activeIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [isOpen, options, activeIndex, onSelect, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { activeIndex, setActiveIndex };
};

// Main component
export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  isMulti = false,
  isSearchable = false,
  disabled = false,
  loading = false,
  error = false,
  errorMessage,
  className,
  customStyles = {},
  'aria-label': ariaLabel,
  testId = 'dropdown',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch] = useDebounce(searchValue, 300);
  const [announcements, setAnnouncements] = useState('');
  const containerRef = useClickOutside(() => setIsOpen(false));
  const listRef = useRef<HTMLDivElement>(null);

  // Filter options based on search
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  // Virtual list setup
  const rowVirtualizer = useVirtualizer({
    count: filteredOptions.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 40,
    overscan: 5,
  });

  // Keyboard navigation
  const { activeIndex, setActiveIndex } = useKeyboardNavigation(
    filteredOptions,
    isOpen,
    handleOptionSelect,
    () => setIsOpen(false)
  );

  // Handle option selection
  function handleOptionSelect(option: DropdownOption) {
    if (option.disabled) return;

    if (isMulti) {
      const values = Array.isArray(value) ? value : [];
      const newValue = values.includes(option.value)
        ? values.filter((v) => v !== option.value)
        : [...values, option.value];
      onChange(newValue);
      announceSelection(option, newValue.includes(option.value));
    } else {
      onChange(option.value);
      setIsOpen(false);
      announceSelection(option, true);
    }
  }

  // Announce selection changes to screen readers
  function announceSelection(option: DropdownOption, isSelected: boolean) {
    const action = isSelected ? 'selected' : 'deselected';
    setAnnouncements(`${option.label} ${action}`);
  }

  // Generate display value
  const getDisplayValue = () => {
    if (Array.isArray(value)) {
      const selectedLabels = options
        .filter((opt) => value.includes(opt.value))
        .map((opt) => opt.label)
        .join(', ');
      return selectedLabels || placeholder;
    }
    return options.find((opt) => opt.value === value)?.label || placeholder;
  };

  return (
    <div
      ref={containerRef}
      className={classNames(
        'relative w-full',
        {
          'opacity-50 cursor-not-allowed': disabled,
          'cursor-pointer': !disabled,
        },
        className,
        customStyles.container
      )}
      data-testid={testId}
    >
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="dropdown-list"
        aria-label={ariaLabel}
        aria-disabled={disabled}
        aria-invalid={error}
        className={classNames(
          'flex items-center justify-between p-2 border rounded-md',
          {
            'border-red-500': error,
            'border-gray-300': !error,
            'hover:border-blue-500': !disabled && !error,
          },
          customStyles.control
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className="truncate">{getDisplayValue()}</span>
        <span className="ml-2">▼</span>
      </div>

      {error && errorMessage && (
        <p className="mt-1 text-sm text-red-500" role="alert">
          {errorMessage}
        </p>
      )}

      {isOpen && (
        <div
          className={classNames(
            'absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg',
            customStyles.menu
          )}
        >
          {isSearchable && (
            <div className="p-2 border-b">
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className={classNames(
                  'w-full p-1 border rounded-sm',
                  customStyles.searchInput
                )}
                placeholder="Search..."
                aria-label="Search options"
              />
            </div>
          )}

          <div
            ref={listRef}
            className="max-h-60 overflow-auto"
            role="listbox"
            aria-multiselectable={isMulti}
            id="dropdown-list"
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const option = filteredOptions[virtualRow.index];
                const isSelected = Array.isArray(value)
                  ? value.includes(option.value)
                  : value === option.value;

                return (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className={classNames(
                      'px-4 py-2 cursor-pointer',
                      {
                        'bg-blue-100': isSelected,
                        'hover:bg-gray-100': !option.disabled,
                        'opacity-50 cursor-not-allowed': option.disabled,
                        'bg-gray-50': virtualRow.index === activeIndex,
                      },
                      customStyles.option
                    )}
                    onClick={() => !option.disabled && handleOptionSelect(option)}
                  >
                    {isMulti && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="mr-2"
                      />
                    )}
                    {option.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="sr-only" role="status" aria-live="polite">
        {announcements}
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50">
          <div className="w-6 h-6 border-2 border-blue-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default Dropdown;