'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary';
import TicketList from '../../../../components/events/TicketList';
import TicketForm from '../../../../components/events/TicketForm';
import { useEventManager } from '../../../../hooks/useEventManager';
import { TicketType } from '../../../../types/event';

/**
 * Error fallback component for graceful error handling
 */
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg">
    <h2 className="text-lg font-semibold text-red-700">Error Loading Tickets</h2>
    <p className="text-red-600 mt-2">{error.message}</p>
    <button
      onClick={resetErrorBoundary}
      className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
    >
      Try Again
    </button>
  </div>
);

/**
 * Main ticket management page component with enhanced error handling and accessibility
 */
const TicketsPage: React.FC = () => {
  // Get event ID from URL parameters
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId');

  // State management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0); // For form reset

  // Event manager hook
  const {
    createEvent,
    updateEvent,
    deleteEvent,
    loadingStates,
    error: eventError,
    cleanup
  } = useEventManager();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Validate event ID
  if (!eventId) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg" role="alert">
        <p className="text-yellow-700">No event selected. Please select an event to manage tickets.</p>
      </div>
    );
  }

  /**
   * Handles ticket form submission with optimistic updates
   */
  const handleTicketSubmit = useCallback(async (ticketData: any) => {
    try {
      if (selectedTicket) {
        await updateEvent({
          id: eventId,
          tickets: [{
            id: selectedTicket,
            ...ticketData
          }]
        });
      } else {
        await createEvent({
          id: eventId,
          tickets: [ticketData]
        });
      }
      setIsModalOpen(false);
      setSelectedTicket(null);
      setFormKey(prev => prev + 1); // Reset form
    } catch (err) {
      console.error('Failed to save ticket:', err);
      throw err; // Let error boundary handle it
    }
  }, [eventId, selectedTicket, createEvent, updateEvent]);

  /**
   * Handles ticket deletion with confirmation
   */
  const handleTicketDelete = useCallback(async (ticketId: string) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) {
      return;
    }

    try {
      await deleteEvent(ticketId);
    } catch (err) {
      console.error('Failed to delete ticket:', err);
      throw err;
    }
  }, [deleteEvent]);

  /**
   * Handles edit ticket action
   */
  const handleTicketEdit = useCallback((ticketId: string) => {
    setSelectedTicket(ticketId);
    setIsModalOpen(true);
  }, []);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        setSelectedTicket(null);
        setIsModalOpen(false);
      }}
    >
      <div className="p-6 max-w-7xl mx-auto" role="main">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Event Tickets</h1>
          <button
            onClick={() => {
              setSelectedTicket(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-accent-color text-white rounded-md hover:bg-accent-color-dark focus:outline-none focus:ring-2 focus:ring-accent-color focus:ring-offset-2"
            aria-label="Create new ticket"
          >
            Create Ticket
          </button>
        </div>

        {/* Ticket list component */}
        <TicketList
          event={{ id: eventId, tickets: [] }} // Tickets loaded via hook
          onEdit={handleTicketEdit}
          onDelete={handleTicketDelete}
          loading={loadingStates.fetchLoading}
          className="mb-6"
        />

        {/* Ticket form modal */}
        {isModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ticket-form-title"
          >
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
              <h2 id="ticket-form-title" className="text-xl font-semibold mb-4">
                {selectedTicket ? 'Edit Ticket' : 'Create New Ticket'}
              </h2>
              
              <TicketForm
                key={formKey}
                eventId={eventId}
                onSubmit={handleTicketSubmit}
                isSubmitting={loadingStates.createLoading || loadingStates.updateLoading}
                onValidationError={(errors) => {
                  console.error('Validation errors:', errors);
                }}
              />

              <button
                onClick={() => setIsModalOpen(false)}
                className="mt-4 px-4 py-2 text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300"
                aria-label="Close ticket form"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Error display */}
        {eventError && (
          <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 p-4 rounded-lg shadow-lg" role="alert">
            <p className="text-red-700">{eventError.error.message}</p>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default TicketsPage;