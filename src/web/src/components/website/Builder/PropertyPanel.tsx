import React, { useCallback, useEffect, useMemo } from 'react';
import classNames from 'classnames'; // v2.3.2
import debounce from 'lodash/debounce'; // v4.0.8
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import Tooltip from '../../../components/common/Tooltip';
import { useWebsiteBuilder } from '../../../hooks/useWebsiteBuilder';
import { DeviceType } from '../../../utils/responsive';
import { ContentBlock, ContentBlockType } from '../../../types/website';

// Style presets following design system specifications
const STYLE_PRESETS = {
  heading: {
    fontFamily: 'Inter',
    fontSize: '32px',
    lineHeight: '1.5',
    fontWeight: '600'
  },
  paragraph: {
    fontFamily: 'Inter',
    fontSize: '16px',
    lineHeight: '1.8',
    fontWeight: '400'
  },
  button: {
    fontFamily: 'Inter',
    fontSize: '14px',
    lineHeight: '1.5',
    fontWeight: '500'
  }
};

// Device type options for responsive design
const DEVICE_TYPES = [
  { value: 'DESKTOP', label: 'Desktop' },
  { value: 'TABLET', label: 'Tablet' },
  { value: 'MOBILE', label: 'Mobile' }
];

// Font family options from design system
const FONT_FAMILY_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Lora', label: 'Lora' }
];

// Padding options with visual feedback
const PADDING_OPTIONS = [
  { value: '0', label: 'None' },
  { value: '4', label: 'Small' },
  { value: '8', label: 'Medium' },
  { value: '16', label: 'Large' }
];

interface PropertyPanelProps {
  block: ContentBlock | null;
  className?: string;
  deviceType: DeviceType;
}

interface StyleUpdateOptions {
  addToHistory?: boolean;
  deviceType: DeviceType;
}

const PropertyPanel: React.FC<PropertyPanelProps> = React.memo(({ 
  block, 
  className,
  deviceType 
}) => {
  const { 
    updateBlock, 
    selectedBlockId,
    undoStyleChange,
    redoStyleChange
  } = useWebsiteBuilder();

  // Get current styles based on device type
  const getCurrentStyles = useCallback(() => {
    if (!block) return {};
    switch (deviceType) {
      case 'MOBILE':
        return block.mobileStyles;
      case 'TABLET':
        return block.tabletStyles;
      default:
        return block.styles;
    }
  }, [block, deviceType]);

  // Debounced style update handler
  const handleStyleChange = useCallback(
    debounce((property: string, value: string, options: StyleUpdateOptions) => {
      if (!block || !selectedBlockId) return;

      const styleKey = options.deviceType === 'MOBILE' ? 'mobileStyles' :
                      options.deviceType === 'TABLET' ? 'tabletStyles' : 'styles';

      const updates = {
        [styleKey]: {
          ...getCurrentStyles(),
          [property]: value
        }
      };

      updateBlock(selectedBlockId, updates);
    }, 150),
    [block, selectedBlockId, getCurrentStyles, updateBlock]
  );

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      handleStyleChange.cancel();
    };
  }, [handleStyleChange]);

  // Memoized current styles
  const currentStyles = useMemo(() => getCurrentStyles(), [getCurrentStyles]);

  if (!block) return null;

  return (
    <div className={classNames(
      'flex flex-col gap-4 p-4 bg-white border-l border-gray-200',
      'overflow-y-auto h-full',
      className
    )}>
      {/* Device Type Selector */}
      <div className="mb-4">
        <Select
          id="device-type"
          name="deviceType"
          label="Device Type"
          value={deviceType}
          options={DEVICE_TYPES}
          onChange={(value) => handleStyleChange('deviceType', value, { deviceType })}
        />
      </div>

      {/* Position and Size Controls */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Position & Size</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="width"
            name="width"
            type="text"
            label="Width"
            value={currentStyles.width || ''}
            onChange={(e) => handleStyleChange('width', e.target.value, { deviceType })}
            placeholder="e.g., 100%"
          />
          <Input
            id="height"
            name="height"
            type="text"
            label="Height"
            value={currentStyles.height || ''}
            onChange={(e) => handleStyleChange('height', e.target.value, { deviceType })}
            placeholder="e.g., auto"
          />
        </div>
      </div>

      {/* Background Controls */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Background</h3>
        <div className="flex items-center gap-2">
          <Input
            id="backgroundColor"
            name="backgroundColor"
            type="color"
            label="Color"
            value={currentStyles.backgroundColor || '#ffffff'}
            onChange={(e) => handleStyleChange('backgroundColor', e.target.value, { deviceType })}
          />
          <Tooltip content="Choose background color">
            <span className="text-gray-500">?</span>
          </Tooltip>
        </div>
      </div>

      {/* Typography Controls */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Typography</h3>
        <Select
          id="fontFamily"
          name="fontFamily"
          label="Font Family"
          value={currentStyles.fontFamily || 'Inter'}
          options={FONT_FAMILY_OPTIONS}
          onChange={(value) => handleStyleChange('fontFamily', value, { deviceType })}
        />
        <Input
          id="fontSize"
          name="fontSize"
          type="text"
          label="Font Size"
          value={currentStyles.fontSize || ''}
          onChange={(e) => handleStyleChange('fontSize', e.target.value, { deviceType })}
          placeholder="e.g., 16px"
        />
      </div>

      {/* Spacing Controls */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Spacing</h3>
        <Select
          id="padding"
          name="padding"
          label="Padding"
          value={currentStyles.padding || '0'}
          options={PADDING_OPTIONS}
          onChange={(value) => handleStyleChange('padding', value, { deviceType })}
        />
      </div>

      {/* Block-specific Controls */}
      {block.type === ContentBlockType.HEADER && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Header Settings</h3>
          <Input
            id="headerHeight"
            name="headerHeight"
            type="text"
            label="Header Height"
            value={currentStyles.headerHeight || ''}
            onChange={(e) => handleStyleChange('headerHeight', e.target.value, { deviceType })}
            placeholder="e.g., 80px"
          />
        </div>
      )}

      {/* History Controls */}
      <div className="flex justify-between mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={undoStyleChange}
          className="text-sm text-gray-600 hover:text-gray-900"
          aria-label="Undo style change"
        >
          Undo
        </button>
        <button
          onClick={redoStyleChange}
          className="text-sm text-gray-600 hover:text-gray-900"
          aria-label="Redo style change"
        >
          Redo
        </button>
      </div>
    </div>
  );
});

PropertyPanel.displayName = 'PropertyPanel';

export default PropertyPanel;