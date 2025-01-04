import React, { FC, useMemo, useCallback } from 'react'; // v18.2.0
import { DndProvider } from 'react-dnd'; // v16.0.1
import { HTML5Backend, TouchBackend, MultiBackend } from 'react-dnd-html5-backend'; // v16.0.1
import { VirtualList } from 'react-tiny-virtual-list'; // v2.2.1
import { useDragAndDrop } from '../../../hooks/useDragAndDrop';
import { useWebsiteBuilder } from '../../../hooks/useWebsiteBuilder';
import { ContentBlockType } from '../../../types/website';

// Component interfaces
interface ComponentPanelProps {
  className?: string;
  onDragStart?: (type: string) => void;
  onDragEnd?: (type: string) => void;
}

interface ComponentItem {
  id: string;
  type: ContentBlockType;
  icon: string;
  label: string;
  description: string;
  previewImage: string;
}

// Available restaurant-specific components
const AVAILABLE_COMPONENTS: ComponentItem[] = [
  {
    id: 'header',
    type: ContentBlockType.HEADER,
    icon: 'layout-header',
    label: 'Header',
    description: 'Restaurant branding and navigation section',
    previewImage: '/assets/previews/header.png'
  },
  {
    id: 'menu',
    type: ContentBlockType.MENU,
    icon: 'menu',
    label: 'Menu',
    description: 'Food and beverage menu display',
    previewImage: '/assets/previews/menu.png'
  },
  {
    id: 'gallery',
    type: ContentBlockType.GALLERY,
    icon: 'image',
    label: 'Gallery',
    description: 'Photo gallery for food and ambiance',
    previewImage: '/assets/previews/gallery.png'
  },
  {
    id: 'contact',
    type: ContentBlockType.CONTACT,
    icon: 'mail',
    label: 'Contact',
    description: 'Contact information and location details',
    previewImage: '/assets/previews/contact.png'
  },
  {
    id: 'events',
    type: ContentBlockType.EVENTS,
    icon: 'calendar',
    label: 'Events',
    description: 'Special events and promotions section',
    previewImage: '/assets/previews/events.png'
  },
  {
    id: 'hours',
    type: ContentBlockType.HOURS,
    icon: 'clock',
    label: 'Hours',
    description: 'Restaurant operating hours display',
    previewImage: '/assets/previews/hours.png'
  }
];

// Component implementation
const ComponentPanel: FC<ComponentPanelProps> = ({ 
  className = '',
  onDragStart,
  onDragEnd 
}) => {
  const { addBlock } = useWebsiteBuilder();

  // Memoize components list to prevent unnecessary re-renders
  const components = useMemo(() => AVAILABLE_COMPONENTS, []);

  // Configure drag and drop for each component
  const handleDragStart = useCallback((type: string) => {
    onDragStart?.(type);
  }, [onDragStart]);

  const handleDragEnd = useCallback((type: string) => {
    onDragEnd?.(type);
  }, [onDragEnd]);

  // Render individual component item with drag functionality
  const ComponentItem: FC<{ item: ComponentItem; index: number }> = useCallback(({ 
    item,
    index 
  }) => {
    const { dragRef, isDragging, dragPreview } = useDragAndDrop({
      type: 'component',
      item: { id: item.id, type: item.type, index },
      onDrop: (draggedItem) => {
        addBlock(draggedItem.type as ContentBlockType, draggedItem.index);
        handleDragEnd(draggedItem.type);
      }
    });

    return (
      <div
        ref={dragRef}
        className={`component-item ${isDragging ? 'dragging' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={`Add ${item.label} component`}
        data-testid={`component-${item.id}`}
      >
        <div ref={dragPreview} className="component-preview">
          <img
            src={item.previewImage}
            alt={`${item.label} preview`}
            className="preview-image"
            loading="lazy"
          />
        </div>
        <div className="component-info">
          <i className={`icon ${item.icon}`} aria-hidden="true" />
          <span className="label">{item.label}</span>
          <p className="description">{item.description}</p>
        </div>
      </div>
    );
  }, [addBlock, handleDragEnd]);

  // Virtualized list configuration for performance
  const listConfig = useMemo(() => ({
    width: '100%',
    height: 600,
    itemCount: components.length,
    itemSize: 100,
    overscanCount: 3
  }), [components.length]);

  return (
    <DndProvider backend={MultiBackend}>
      <aside
        className={`component-panel ${className}`}
        aria-label="Website Components"
        role="complementary"
      >
        <header className="panel-header">
          <h2>Components</h2>
          <p className="helper-text">Drag components to add them to your website</p>
        </header>
        
        <div className="components-container">
          <VirtualList
            {...listConfig}
            renderItem={({ index, style }) => (
              <div style={style}>
                <ComponentItem
                  item={components[index]}
                  index={index}
                />
              </div>
            )}
          />
        </div>

        <footer className="panel-footer">
          <p className="components-count">
            {components.length} components available
          </p>
        </footer>
      </aside>
    </DndProvider>
  );
};

// Default export with display name for debugging
ComponentPanel.displayName = 'ComponentPanel';
export default ComponentPanel;