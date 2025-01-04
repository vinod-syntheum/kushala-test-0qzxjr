import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // v14.0.0
import userEvent from '@testing-library/user-event'; // v14.0.0
import { Provider } from 'react-redux'; // v8.1.0
import { configureStore } from '@reduxjs/toolkit'; // v1.9.5
import Canvas from '../../src/components/website/Builder/Canvas';
import { useWebsiteBuilder } from '../../src/hooks/useWebsiteBuilder';
import { websiteActions } from '../../src/store/slices/websiteSlice';
import { ContentBlock, ContentBlockType } from '../../src/types/website';

// Mock ResizeObserver for DOM measurements
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Helper function to render components with Redux store
const renderWithRedux = (
  component: React.ReactElement,
  initialState = {},
  storeOptions = {}
) => {
  const store = configureStore({
    reducer: {
      website: (state = initialState, action) => state
    },
    ...storeOptions
  });

  return {
    ...render(<Provider store={store}>{component}</Provider>),
    store
  };
};

// Mock block factory
const createMockBlock = (props: Partial<ContentBlock> = {}): ContentBlock => ({
  id: `block-${Math.random().toString(36).substr(2, 9)}`,
  type: ContentBlockType.HEADER,
  content: {},
  order: 0,
  styles: {
    backgroundColor: '#ffffff',
    padding: '1rem',
    margin: '0',
    textColor: '#000000',
    fontFamily: 'Inter',
    fontSize: '16px',
    lineHeight: '1.5',
    borderRadius: '0',
    boxShadow: 'none'
  },
  isVisible: true,
  mobileStyles: {
    backgroundColor: '#ffffff',
    padding: '0.5rem',
    margin: '0',
    textColor: '#000000',
    fontFamily: 'Inter',
    fontSize: '14px',
    lineHeight: '1.4',
    borderRadius: '0',
    boxShadow: 'none'
  },
  tabletStyles: {
    backgroundColor: '#ffffff',
    padding: '0.75rem',
    margin: '0',
    textColor: '#000000',
    fontFamily: 'Inter',
    fontSize: '15px',
    lineHeight: '1.45',
    borderRadius: '0',
    boxShadow: 'none'
  },
  ...props
});

describe('Website Builder Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render canvas with initial blocks', async () => {
    const initialBlocks = [
      createMockBlock({ type: ContentBlockType.HEADER, order: 0 }),
      createMockBlock({ type: ContentBlockType.MENU, order: 1 })
    ];

    const { container } = renderWithRedux(
      <Canvas scale={1} previewMode={false} deviceType="DESKTOP" />,
      { blocks: initialBlocks }
    );

    await waitFor(() => {
      expect(container.querySelectorAll('.canvas-block')).toHaveLength(2);
    });

    const blocks = container.querySelectorAll('.canvas-block');
    expect(blocks[0]).toHaveAttribute('aria-label', 'HEADER content block');
    expect(blocks[1]).toHaveAttribute('aria-label', 'MENU content block');
  });

  it('should handle drag and drop operations', async () => {
    const initialBlocks = [
      createMockBlock({ type: ContentBlockType.HEADER, order: 0 }),
      createMockBlock({ type: ContentBlockType.MENU, order: 1 })
    ];

    const { container, store } = renderWithRedux(
      <Canvas scale={1} previewMode={false} deviceType="DESKTOP" />,
      { blocks: initialBlocks }
    );

    const firstBlock = container.querySelector('[data-testid="drop-zone-0"]');
    const secondBlock = container.querySelector('[data-testid="drop-zone-1"]');

    if (firstBlock && secondBlock) {
      fireEvent.dragStart(firstBlock);
      fireEvent.dragOver(secondBlock);
      fireEvent.drop(secondBlock);
    }

    await waitFor(() => {
      const state = store.getState();
      expect(state.website.blocks[0].type).toBe(ContentBlockType.MENU);
      expect(state.website.blocks[1].type).toBe(ContentBlockType.HEADER);
    });
  });

  it('should handle responsive preview modes', async () => {
    const block = createMockBlock({ type: ContentBlockType.HEADER });
    
    const { container, rerender } = renderWithRedux(
      <Canvas scale={1} previewMode={false} deviceType="DESKTOP" />,
      { blocks: [block] }
    );

    // Test desktop view
    expect(container.querySelector('.canvas-container--desktop')).toBeTruthy();

    // Test tablet view
    rerender(
      <Provider store={configureStore({ reducer: { website: state => state } })}>
        <Canvas scale={1} previewMode={false} deviceType="TABLET" />
      </Provider>
    );
    expect(container.querySelector('.canvas-container--tablet')).toBeTruthy();

    // Test mobile view
    rerender(
      <Provider store={configureStore({ reducer: { website: state => state } })}>
        <Canvas scale={1} previewMode={false} deviceType="MOBILE" />
      </Provider>
    );
    expect(container.querySelector('.canvas-container--mobile')).toBeTruthy();
  });

  it('should handle block selection and editing', async () => {
    const block = createMockBlock({ type: ContentBlockType.HEADER });
    const user = userEvent.setup();

    const { container, store } = renderWithRedux(
      <Canvas scale={1} previewMode={false} deviceType="DESKTOP" />,
      { blocks: [block] }
    );

    const blockElement = container.querySelector('.canvas-block');
    if (blockElement) {
      await user.click(blockElement);
    }

    await waitFor(() => {
      const state = store.getState();
      expect(state.website.selectedBlockId).toBe(block.id);
    });
  });

  it('should validate time to launch requirements', async () => {
    const startTime = Date.now();
    const block = createMockBlock({ type: ContentBlockType.HEADER });

    const { container } = renderWithRedux(
      <Canvas scale={1} previewMode={false} deviceType="DESKTOP" />,
      { blocks: [block] }
    );

    // Simulate quick website building operations
    for (let i = 0; i < 5; i++) {
      const newBlock = createMockBlock({ type: ContentBlockType.MENU, order: i + 1 });
      store.dispatch(websiteActions.addBlock(newBlock));
    }

    await waitFor(() => {
      const blocks = container.querySelectorAll('.canvas-block');
      expect(blocks).toHaveLength(6);
    });

    const buildTime = Date.now() - startTime;
    expect(buildTime).toBeLessThan(30 * 60 * 1000); // 30 minutes in milliseconds
  });

  it('should handle undo/redo operations', async () => {
    const initialBlock = createMockBlock({ type: ContentBlockType.HEADER });
    const user = userEvent.setup();

    const { container, store } = renderWithRedux(
      <Canvas scale={1} previewMode={false} deviceType="DESKTOP" />,
      { blocks: [initialBlock] }
    );

    // Add a block
    const newBlock = createMockBlock({ type: ContentBlockType.MENU });
    store.dispatch(websiteActions.addBlock(newBlock));

    // Trigger undo
    await user.keyboard('{Control>}z{/Control}');

    await waitFor(() => {
      const blocks = container.querySelectorAll('.canvas-block');
      expect(blocks).toHaveLength(1);
    });

    // Trigger redo
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');

    await waitFor(() => {
      const blocks = container.querySelectorAll('.canvas-block');
      expect(blocks).toHaveLength(2);
    });
  });
});