import React, { useCallback, useMemo, useRef } from 'react';
import classNames from 'classnames';
import { useVirtualizer } from '@tanstack/react-virtual';
import { PaginatedResponse } from '../types/common';
import Loading from './Loading';

/**
 * Interface defining table column configuration with accessibility and sorting support
 */
export interface TableColumn<T> {
  key: string;
  title: string | React.ReactNode;
  sortable?: boolean;
  width?: number | string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

/**
 * Props interface for the Table component
 */
interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[] | PaginatedResponse<T>;
  loading?: boolean;
  rowKey?: string | ((record: T) => string);
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  initialSortKey?: string;
  initialSortOrder?: 'asc' | 'desc';
  rowHeight?: number;
  className?: string;
  onRowClick?: (record: T, index: number) => void;
  emptyText?: string | React.ReactNode;
  virtualize?: boolean;
}

/**
 * Custom hook for managing table sort state
 */
const useTableSort = (initialKey?: string, initialOrder?: 'asc' | 'desc') => {
  const [sortState, setSortState] = React.useState<{
    key?: string;
    order?: 'asc' | 'desc';
  }>({
    key: initialKey,
    order: initialOrder,
  });

  const toggleSort = useCallback((key: string) => {
    setSortState(prev => ({
      key,
      order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  return { sortState, toggleSort };
};

/**
 * Custom hook for virtual scrolling implementation
 */
const useVirtualRows = <T,>(data: T[], rowHeight: number) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return { parentRef, virtualRows, totalSize };
};

/**
 * A reusable, accessible table component with sorting, pagination, and virtual scrolling support
 */
const Table = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  rowKey = 'id',
  onSort,
  initialSortKey,
  initialSortOrder,
  rowHeight = 48,
  className,
  onRowClick,
  emptyText = 'No data available',
  virtualize = false,
}: TableProps<T>) => {
  // Handle both array and paginated data
  const tableData = Array.isArray(data) ? data : data.data;
  const isPaginated = !Array.isArray(data);

  // Sort management
  const { sortState, toggleSort } = useTableSort(initialSortKey, initialSortOrder);

  // Virtual scrolling setup
  const { parentRef, virtualRows, totalSize } = useVirtualRows(tableData, rowHeight);

  // Memoized row key getter
  const getRowKey = useCallback(
    (record: T, index: number) => {
      if (typeof rowKey === 'function') {
        return rowKey(record);
      }
      return record[rowKey] ?? index;
    },
    [rowKey]
  );

  // Handle sort click
  const handleSortClick = useCallback(
    (column: TableColumn<T>) => {
      if (!column.sortable) return;
      toggleSort(column.key);
      onSort?.(column.key, sortState.key === column.key && sortState.order === 'asc' ? 'desc' : 'asc');
    },
    [sortState, toggleSort, onSort]
  );

  // Render table header
  const renderHeader = useMemo(() => (
    <thead className="bg-gray-50">
      <tr>
        {columns.map(column => (
          <th
            key={column.key}
            className={classNames(
              'px-4 py-3 text-left text-sm font-medium text-gray-700',
              column.sortable && 'cursor-pointer select-none',
              column.align && `text-${column.align}`
            )}
            style={{ width: column.width }}
            onClick={() => column.sortable && handleSortClick(column)}
            role={column.sortable ? 'button' : undefined}
            aria-sort={
              sortState.key === column.key
                ? sortState.order === 'asc'
                  ? 'ascending'
                  : 'descending'
                : undefined
            }
          >
            <div className="flex items-center gap-2">
              {column.title}
              {column.sortable && sortState.key === column.key && (
                <span className="text-gray-400">
                  {sortState.order === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  ), [columns, sortState, handleSortClick]);

  // Render table body
  const renderBody = useMemo(() => {
    if (loading) {
      return (
        <tr>
          <td colSpan={columns.length} className="text-center py-8">
            <Loading size="medium" />
          </td>
        </tr>
      );
    }

    if (!tableData.length) {
      return (
        <tr>
          <td
            colSpan={columns.length}
            className="text-center py-8 text-gray-500"
          >
            {emptyText}
          </td>
        </tr>
      );
    }

    const rows = virtualize ? virtualRows : tableData.map((_, index) => ({ index }));

    return rows.map(virtualRow => {
      const rowIndex = virtualRow.index;
      const item = tableData[rowIndex];
      
      return (
        <tr
          key={getRowKey(item, rowIndex)}
          className={classNames(
            'hover:bg-gray-50 transition-colors',
            onRowClick && 'cursor-pointer'
          )}
          onClick={() => onRowClick?.(item, rowIndex)}
          style={virtualize ? { height: rowHeight, transform: `translateY(${virtualRow.start}px)` } : undefined}
        >
          {columns.map(column => (
            <td
              key={column.key}
              className={classNames(
                'px-4 py-3 text-sm border-b border-gray-200',
                column.align && `text-${column.align}`
              )}
            >
              {column.render
                ? column.render(item[column.key], item, rowIndex)
                : item[column.key]}
            </td>
          ))}
        </tr>
      );
    });
  }, [columns, tableData, loading, virtualize, virtualRows, rowHeight, getRowKey, onRowClick, emptyText]);

  return (
    <div
      className={classNames(
        'relative overflow-hidden rounded-lg shadow-sm border border-gray-200',
        className
      )}
    >
      <div
        ref={parentRef}
        className="overflow-auto"
        style={virtualize ? { height: totalSize } : undefined}
      >
        <table
          className="min-w-full divide-y divide-gray-200"
          role="grid"
          aria-busy={loading}
          aria-colcount={columns.length}
          aria-rowcount={tableData.length}
        >
          {renderHeader}
          <tbody className="bg-white divide-y divide-gray-200">
            {renderBody}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default React.memo(Table) as typeof Table;