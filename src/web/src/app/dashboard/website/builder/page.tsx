'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react'; // v18.2.0
import { DndProvider } from 'react-dnd'; // v16.0.1
import { HTML5Backend, TouchBackend, MultiBackend } from 'react-dnd-multi-backend'; // v8.0.0
import { useAnalytics } from '@vercel/analytics'; // v1.0.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.11

import Canvas from '../../../components/website/Builder/Canvas';
import ComponentPanel from '../../../components/website/Builder/ComponentPanel';
import PropertyPanel from '../../../components/website/Builder/PropertyPanel';
import { useWebsiteBuilder } from '../../../hooks/useWebsiteBuilder';
import { viewportManager, DeviceType } from '../../../utils/responsive';

// Custom backend configuration for cross-platform drag and drop
const HTML5toTouch = {
  backends: [
    {
      id: 'html5',
      backend: HTML5Backend,
      preview: true,
      transition: {
        dragStartMode: 'immediate'
      }
    },
    {
      id: 'touch',
      backend: TouchBackend,
      options: { enableMouseEvents: true },
      preview: true
    }
  ]
};

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
  <div className="error-container p-4 bg-red-50 border border-red-200 rounded-md">
    <h2 className="text-red-800 font-semibold mb-2">Something went wrong:</h2>
    <pre className="text-sm text-red-600">{error.message}</pre>
    <button
      onClick={resetErrorBoundary}
      className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Try again
    </button>
  </div>
);

const WebsiteBuilder: React.FC = () => {
  // Analytics integration
  const { track } = useAnalytics();

  // Website builder state
  const {
    blocks,
    selectedBlockId,
    addBlock,
    updateBlock,
    moveBlock,
    selectBlock,
    undo,
    redo,
    canUndo,
    canRedo
  } = useWebsiteBuilder();

  // Local state
  const [previewMode, setPreviewMode] = useState(false);
  const [deviceType, setDeviceType] = useState<DeviceType>('DESKTOP');
  const [scale, setScale] = useState(1);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Handle preview mode toggle
  const handlePreviewToggle = useCallback((newDeviceType?: DeviceType) => {
    setPreviewMode(prev => !prev);
    if (newDeviceType) {
      setDeviceType(newDeviceType);
      track('preview_device_changed', { deviceType: newDeviceType });
    }
    track('preview_mode_toggled', { enabled: !previewMode });
  }, [previewMode, track]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
              track('redo_triggered', { method: 'keyboard' });
            } else {
              undo();
              track('undo_triggered', { method: 'keyboard' });
            }
            break;
          case 'p':
            e.preventDefault();
            handlePreviewToggle();
            break;
          case '[':
            e.preventDefault();
            setShowLeftPanel(prev => !prev);
            break;
          case ']':
            e.preventDefault();
            setShowRightPanel(prev => !prev);
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [undo, redo, handlePreviewToggle, track]);

  // Handle responsive preview scaling
  useEffect(() => {
    const handleViewportChange = () => {
      const { width } = viewportManager.getState();
      const newScale = Math.min(Math.max(width / 1440, 0.25), 1);
      setScale(newScale);
    };

    viewportManager.on(handleViewportChange);
    handleViewportChange();

    return () => viewportManager.off(handleViewportChange);
  }, []);

  // Autosave functionality
  useEffect(() => {
    let autosaveTimeout: NodeJS.Timeout;

    const performAutosave = async () => {
      if (blocks.length > 0) {
        setIsAutosaving(true);
        try {
          // Autosave implementation would go here
          track('website_autosaved', { blockCount: blocks.length });
        } catch (error) {
          console.error('Autosave failed:', error);
        } finally {
          setIsAutosaving(false);
        }
      }
    };

    autosaveTimeout = setTimeout(performAutosave, 30000); // 30 second autosave
    return () => clearTimeout(autosaveTimeout);
  }, [blocks, track]);

  // Memoized selected block
  const selectedBlock = useMemo(() => 
    blocks.find(block => block.id === selectedBlockId),
    [blocks, selectedBlockId]
  );

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <DndProvider backend={MultiBackend} options={HTML5toTouch}>
        <div className="flex h-screen bg-gray-50">
          {/* Left Panel - Component Library */}
          <div
            className={`w-80 border-r border-gray-200 bg-white transition-all duration-300 ${
              showLeftPanel ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <ComponentPanel
              onDragStart={() => track('component_drag_started')}
              onDragEnd={() => track('component_drag_ended')}
            />
          </div>

          {/* Center Panel - Canvas */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col">
              {/* Toolbar */}
              <div className="h-14 border-b border-gray-200 bg-white px-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowLeftPanel(prev => !prev)}
                    className="p-2 hover:bg-gray-100 rounded"
                    aria-label="Toggle component panel"
                  >
                    <i className="icon-menu" />
                  </button>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePreviewToggle('DESKTOP')}
                      className={`p-2 rounded ${deviceType === 'DESKTOP' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                      aria-label="Desktop preview"
                    >
                      <i className="icon-desktop" />
                    </button>
                    <button
                      onClick={() => handlePreviewToggle('TABLET')}
                      className={`p-2 rounded ${deviceType === 'TABLET' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                      aria-label="Tablet preview"
                    >
                      <i className="icon-tablet" />
                    </button>
                    <button
                      onClick={() => handlePreviewToggle('MOBILE')}
                      className={`p-2 rounded ${deviceType === 'MOBILE' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                      aria-label="Mobile preview"
                    >
                      <i className="icon-mobile" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {isAutosaving && (
                    <span className="text-sm text-gray-500">Saving...</span>
                  )}
                  <button
                    onClick={undo}
                    disabled={!canUndo}
                    className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                    aria-label="Undo"
                  >
                    <i className="icon-undo" />
                  </button>
                  <button
                    onClick={redo}
                    disabled={!canRedo}
                    className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                    aria-label="Redo"
                  >
                    <i className="icon-redo" />
                  </button>
                  <button
                    onClick={() => handlePreviewToggle()}
                    className={`px-4 py-2 rounded ${previewMode ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                  >
                    {previewMode ? 'Exit Preview' : 'Preview'}
                  </button>
                </div>
              </div>

              {/* Canvas Area */}
              <div className="flex-1 overflow-auto">
                <Canvas
                  scale={scale}
                  previewMode={previewMode}
                  deviceType={deviceType}
                />
              </div>
            </div>
          </div>

          {/* Right Panel - Property Editor */}
          <div
            className={`w-80 border-l border-gray-200 bg-white transition-all duration-300 ${
              showRightPanel ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <PropertyPanel
              block={selectedBlock}
              deviceType={deviceType}
            />
          </div>
        </div>
      </DndProvider>
    </ErrorBoundary>
  );
};

export default WebsiteBuilder;