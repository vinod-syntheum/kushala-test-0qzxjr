import { useCallback, useState, useEffect, useMemo } from 'react'; // v18.2.0
import { useSelector, useDispatch } from 'react-redux'; // v8.1.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { 
  ContentBlock, 
  ContentBlockType, 
  WebsiteState, 
  BlockStyles, 
  SEOMetadata, 
  ResponsiveStyles, 
  DeviceType 
} from '../../types/website';
import { websiteActions } from '../../store/slices/websiteSlice';

/**
 * Custom hook for managing website builder functionality
 * Provides comprehensive state management and operations for the website builder
 */
export const useWebsiteBuilder = () => {
  const dispatch = useDispatch();
  const websiteState = useSelector((state: { website: WebsiteState }) => state.website);
  const [currentDevice, setCurrentDevice] = useState<DeviceType>('DESKTOP');

  // Memoized state values
  const canUndo = useMemo(() => websiteState.history.length > 0, [websiteState.history]);
  const canRedo = useMemo(() => websiteState.currentHistoryIndex < websiteState.history.length - 1, 
    [websiteState.currentHistoryIndex, websiteState.history]);

  // Block Management Functions
  const addBlock = useCallback((type: ContentBlockType, position: number) => {
    const newBlock: ContentBlock = {
      id: uuidv4(),
      type,
      content: {},
      order: position,
      styles: {} as BlockStyles,
      isVisible: true,
      mobileStyles: {} as BlockStyles,
      tabletStyles: {} as BlockStyles
    };
    dispatch(websiteActions.addBlock(newBlock));
  }, [dispatch]);

  const updateBlock = useCallback((id: string, updates: Partial<ContentBlock>) => {
    dispatch(websiteActions.updateBlock({ id, updates }));
  }, [dispatch]);

  const removeBlock = useCallback((id: string) => {
    dispatch(websiteActions.removeBlock(id));
  }, [dispatch]);

  const moveBlock = useCallback((sourceIndex: number, destinationIndex: number) => {
    dispatch(websiteActions.reorderBlocks({ sourceIndex, destinationIndex }));
  }, [dispatch]);

  const selectBlock = useCallback((id: string | null) => {
    dispatch(websiteActions.setSelectedBlock(id));
  }, [dispatch]);

  // SEO Management
  const updateSEO = useCallback((blockId: string, metadata: SEOMetadata) => {
    const sanitizedMetadata = {
      ...metadata,
      keywords: metadata.keywords.filter(Boolean),
      title: metadata.title.trim(),
      description: metadata.description.trim()
    };
    
    dispatch(websiteActions.updateBlock({
      id: blockId,
      updates: { seoMetadata: sanitizedMetadata }
    }));
  }, [dispatch]);

  // Responsive Design Management
  const updateResponsiveStyles = useCallback((
    blockId: string, 
    deviceType: DeviceType, 
    styles: ResponsiveStyles
  ) => {
    const styleKey = deviceType === 'MOBILE' ? 'mobileStyles' : 
                    deviceType === 'TABLET' ? 'tabletStyles' : 'styles';
    
    dispatch(websiteActions.updateBlock({
      id: blockId,
      updates: { [styleKey]: styles }
    }));
  }, [dispatch]);

  const setPreviewDevice = useCallback((deviceType: DeviceType) => {
    setCurrentDevice(deviceType);
  }, []);

  // History Management
  const undo = useCallback(() => {
    if (canUndo) {
      dispatch(websiteActions.undo());
    }
  }, [dispatch, canUndo]);

  const redo = useCallback(() => {
    if (canRedo) {
      dispatch(websiteActions.redo());
    }
  }, [dispatch, canRedo]);

  // Effect for handling device-specific preview updates
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setCurrentDevice('MOBILE');
      } else if (width < 1024) {
        setCurrentDevice('TABLET');
      } else {
        setCurrentDevice('DESKTOP');
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    // State
    blocks: websiteState.blocks,
    selectedBlockId: websiteState.selectedBlockId,
    isDragging: websiteState.isDragging,
    currentDevice,
    canUndo,
    canRedo,

    // Block Management
    addBlock,
    updateBlock,
    removeBlock,
    moveBlock,
    selectBlock,

    // SEO Management
    updateSEO,

    // Responsive Design
    updateResponsiveStyles,
    setPreviewDevice,

    // History Management
    undo,
    redo
  };
};

export type UseWebsiteBuilderReturn = ReturnType<typeof useWebsiteBuilder>;