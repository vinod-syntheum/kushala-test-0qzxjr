import React, { useCallback, useMemo, useState } from 'react';
import classNames from 'classnames'; // v2.x
import { ErrorBoundary } from 'react-error-boundary'; // v4.x
import Table, { TableProps, SortConfig } from '../common/Table';
import Button, { ButtonProps } from '../common/Button';

/**
 * Enum representing different ticket types available for events
 */
export enum TicketType {
  GENERAL_ADMISSION = 'GENERAL_ADMISSION',
  VIP = 'VIP',
  EARLY_BIRD = 'EARLY_BIRD',
  GROUP = 'GROUP',
  STUDENT = 'STUDENT'
}

/**
 * Interface representing a ticket with its properties
 */
interface Ticket {
  id: string;
  type: TicketType;
  price: number;
  quantity: number;
  sold: number;
  revenue: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Props interface for the TicketList component
 */
export interface TicketListProps {
  event: {
    id: string;
    tickets: Ticket[];
  };
  onEdit: (ticketId: string) => Promise<void>;
  onDelete: (ticketId: string) => Promise<void>;
  loading?: boolean;
  className?: string;
  locale?: string;
}

/**
 * Formats currency values according to locale settings
 */
const formatCurrency = (value: number, locale = 'en-US'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value);
};

/**
 * Formats ticket type for display
 */
const formatTicketType = (type: TicketType): string => {
  return type.toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * A component that displays and manages event tickets in a tabular format
 */
const TicketList: React.FC<TicketListProps> = React.memo(({
  event,
  onEdit,
  onDelete,
  loading = false,
  className = '',
  locale = 'en-US'
}) => {
  // State for sorting configuration
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'type',
    order: 'asc'
  });

  // Memoized table columns configuration
  const columns = useMemo(() => [
    {
      key: 'type',
      title: 'Ticket Type',
      sortable: true,
      render: (value: TicketType) => formatTicketType(value)
    },
    {
      key: 'price',
      title: 'Price',
      sortable: true,
      align: 'right' as const,
      render: (value: number) => formatCurrency(value, locale)
    },
    {
      key: 'quantity',
      title: 'Available',
      sortable: true,
      align: 'right' as const,
      render: (value: number, record: Ticket) => `${record.quantity - record.sold}/${value}`
    },
    {
      key: 'sold',
      title: 'Sold',
      sortable: true,
      align: 'right' as const
    },
    {
      key: 'revenue',
      title: 'Revenue',
      sortable: true,
      align: 'right' as const,
      render: (value: number) => formatCurrency(value, locale)
    },
    {
      key: 'actions',
      title: 'Actions',
      align: 'center' as const,
      render: (_: any, record: Ticket) => (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(record.id)}
            ariaLabel={`Edit ${formatTicketType(record.type)} ticket`}
          >
            Edit
          </Button>
          <Button
            variant="text"
            size="sm"
            onClick={() => handleDelete(record.id)}
            ariaLabel={`Delete ${formatTicketType(record.type)} ticket`}
          >
            Delete
          </Button>
        </div>
      )
    }
  ], [locale]);

  // Memoized ticket statistics
  const statistics = useMemo(() => {
    return event.tickets.reduce((acc, ticket) => ({
      totalRevenue: acc.totalRevenue + ticket.revenue,
      totalSold: acc.totalSold + ticket.sold,
      totalAvailable: acc.totalAvailable + (ticket.quantity - ticket.sold)
    }), {
      totalRevenue: 0,
      totalSold: 0,
      totalAvailable: 0
    });
  }, [event.tickets]);

  // Event handlers
  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortConfig({ key, order });
  }, []);

  const handleEdit = useCallback(async (ticketId: string) => {
    try {
      await onEdit(ticketId);
    } catch (error) {
      console.error('Failed to edit ticket:', error);
    }
  }, [onEdit]);

  const handleDelete = useCallback(async (ticketId: string) => {
    try {
      await onDelete(ticketId);
    } catch (error) {
      console.error('Failed to delete ticket:', error);
    }
  }, [onDelete]);

  // Error fallback component
  const ErrorFallback = ({ error }: { error: Error }) => (
    <div className="text-red-600 p-4 text-center">
      <p>Error loading tickets: {error.message}</p>
    </div>
  );

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className={classNames('space-y-4', className)}>
        {/* Statistics summary */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(statistics.totalRevenue, locale)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Tickets Sold</h3>
            <p className="text-2xl font-semibold text-gray-900">
              {statistics.totalSold}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Available Tickets</h3>
            <p className="text-2xl font-semibold text-gray-900">
              {statistics.totalAvailable}
            </p>
          </div>
        </div>

        {/* Tickets table */}
        <Table<Ticket>
          columns={columns}
          data={event.tickets}
          loading={loading}
          rowKey="id"
          onSort={handleSort}
          initialSortKey={sortConfig.key}
          initialSortOrder={sortConfig.order}
          className="bg-white rounded-lg shadow-sm"
          emptyText="No tickets available for this event"
        />
      </div>
    </ErrorBoundary>
  );
});

TicketList.displayName = 'TicketList';

export default TicketList;