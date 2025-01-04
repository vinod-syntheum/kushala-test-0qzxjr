/**
 * Redux Toolkit slice for managing website builder state
 * Includes content blocks, templates, editing functionality, and enhanced state management
 * @version 1.0.0
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { WebsiteState, ContentBlock } from '../../types/website';
import { api } from '../../lib/api';

// Enhanced validation state interface
interface ValidationState {
  isValid: boolean;
  errors: string[];
}

// State change tracking for undo/redo
interface StateChange {
  timestamp: number;
  blocks: ContentBlock[];
  type: string;
}

// Enhanced website slice state
interface WebsiteSliceState extends WebsiteState {
  loading: boolean;
  error: string | null;
  history: StateChange[];
  undoStack: StateChange[];
  redoStack: StateChange[];
  lastSaved: Date | null;
  validationErrors: ValidationState[];
  autosaveEnabled: boolean;
  unsavedChanges: boolean;
}

// Initial state with comprehensive defaults
const initialState: WebsiteSliceState = {
  loading: false,
  error: null,
  blocks: [],
  selectedBlockId: null,
  isDragging: false,
  isEditing: false,
  history: [],
  undoStack: [],
  redoStack: [],
  lastSaved: null,
  validationErrors: [],
  autosaveEnabled: true,
  unsavedChanges: false,
  currentHistoryIndex: 0,
  viewMode: 'DESKTOP'
};

// Create the website slice with enhanced functionality
const websiteSlice = createSlice({
  name: 'website',
  initialState,
  reducers: {
    // Block management
    addBlock: (state, action: PayloadAction<ContentBlock>) => {
      state.blocks.push(action.payload);
      state.undoStack.push({
        timestamp: Date.now(),
        blocks: [...state.blocks],
        type: 'ADD_BLOCK'
      });
      state.redoStack = [];
      state.unsavedChanges = true;
    },

    updateBlock: (state, action: PayloadAction<{ id: string; updates: Partial<ContentBlock> }>) => {
      const index = state.blocks.findIndex(block => block.id === action.payload.id);
      if (index !== -1) {
        state.blocks[index] = { ...state.blocks[index], ...action.payload.updates };
        state.undoStack.push({
          timestamp: Date.now(),
          blocks: [...state.blocks],
          type: 'UPDATE_BLOCK'
        });
        state.redoStack = [];
        state.unsavedChanges = true;
      }
    },

    removeBlock: (state, action: PayloadAction<string>) => {
      const index = state.blocks.findIndex(block => block.id === action.payload);
      if (index !== -1) {
        state.undoStack.push({
          timestamp: Date.now(),
          blocks: [...state.blocks],
          type: 'REMOVE_BLOCK'
        });
        state.blocks.splice(index, 1);
        state.redoStack = [];
        state.unsavedChanges = true;
      }
    },

    // Block ordering
    reorderBlocks: (state, action: PayloadAction<{ sourceIndex: number; targetIndex: number }>) => {
      const { sourceIndex, targetIndex } = action.payload;
      const [movedBlock] = state.blocks.splice(sourceIndex, 1);
      state.blocks.splice(targetIndex, 0, movedBlock);
      state.undoStack.push({
        timestamp: Date.now(),
        blocks: [...state.blocks],
        type: 'REORDER_BLOCKS'
      });
      state.redoStack = [];
      state.unsavedChanges = true;
    },

    // Selection and editing state
    setSelectedBlock: (state, action: PayloadAction<string | null>) => {
      state.selectedBlockId = action.payload;
    },

    setDragging: (state, action: PayloadAction<boolean>) => {
      state.isDragging = action.payload;
    },

    setEditing: (state, action: PayloadAction<boolean>) => {
      state.isEditing = action.payload;
    },

    // History management
    undo: (state) => {
      const lastChange = state.undoStack.pop();
      if (lastChange) {
        state.redoStack.push({
          timestamp: Date.now(),
          blocks: [...state.blocks],
          type: 'UNDO'
        });
        state.blocks = lastChange.blocks;
        state.unsavedChanges = true;
      }
    },

    redo: (state) => {
      const nextChange = state.redoStack.pop();
      if (nextChange) {
        state.undoStack.push({
          timestamp: Date.now(),
          blocks: [...state.blocks],
          type: 'REDO'
        });
        state.blocks = nextChange.blocks;
        state.unsavedChanges = true;
      }
    },

    // Autosave management
    setAutosaveEnabled: (state, action: PayloadAction<boolean>) => {
      state.autosaveEnabled = action.payload;
    },

    // Loading states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Save management
    setSaved: (state) => {
      state.lastSaved = new Date();
      state.unsavedChanges = false;
    },

    // Validation
    setValidationErrors: (state, action: PayloadAction<ValidationState[]>) => {
      state.validationErrors = action.payload;
    },

    // Content loading
    setBlocks: (state, action: PayloadAction<ContentBlock[]>) => {
      state.blocks = action.payload;
      state.undoStack = [];
      state.redoStack = [];
      state.unsavedChanges = false;
    }
  }
});

// Export actions and reducer
export const websiteActions = websiteSlice.actions;
export default websiteSlice.reducer;

// Async thunks for API interactions
export const fetchWebsiteContent = (restaurantId: string) => async (dispatch: any) => {
  try {
    dispatch(websiteActions.setLoading(true));
    const response = await api.get<ContentBlock[]>(`/restaurants/${restaurantId}/website`);
    dispatch(websiteActions.setBlocks(response.data));
    dispatch(websiteActions.setError(null));
  } catch (error: any) {
    dispatch(websiteActions.setError(error.message));
  } finally {
    dispatch(websiteActions.setLoading(false));
  }
};

export const saveWebsiteContent = (restaurantId: string, blocks: ContentBlock[]) => async (dispatch: any) => {
  try {
    dispatch(websiteActions.setLoading(true));
    await api.put(`/restaurants/${restaurantId}/website`, { blocks });
    dispatch(websiteActions.setSaved());
    dispatch(websiteActions.setError(null));
  } catch (error: any) {
    dispatch(websiteActions.setError(error.message));
  } finally {
    dispatch(websiteActions.setLoading(false));
  }
};