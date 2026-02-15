// =============================================================================
// PAGINATION CONTROLS - For Laravel Paginated API responses
// =============================================================================

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

// Laravel pagination response structure
export interface PaginationMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  from: number | null;
  to: number | null;
}

// Convert Laravel snake_case response to camelCase
export function parseLaravelPagination<T>(response: {
  current_page: number;
  data: T[];
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}): { data: T[]; meta: PaginationMeta } {
  return {
    data: response.data,
    meta: {
      currentPage: response.current_page,
      lastPage: response.last_page,
      perPage: response.per_page,
      total: response.total,
      from: response.from,
      to: response.to,
    },
  };
}

interface PaginationControlsProps {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  from: number | null;
  to: number | null;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  perPageOptions?: number[];
  isLoading?: boolean;
}

export function PaginationControls({
  currentPage,
  lastPage,
  perPage,
  total,
  from,
  to,
  onPageChange,
  onPerPageChange,
  perPageOptions = [5, 10, 25, 50, 100],
  isLoading = false,
}: PaginationControlsProps) {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < lastPage;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4">
      {/* Results info */}
      <div className="text-sm text-slate-500">
        {total === 0 ? (
          'No results'
        ) : (
          <>
            Showing <span className="font-medium text-slate-700">{from}</span> to{' '}
            <span className="font-medium text-slate-700">{to}</span> of{' '}
            <span className="font-medium text-slate-700">{total}</span> results
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Per page selector */}
        {onPerPageChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Per page:</span>
            <Select
              value={String(perPage)}
              onValueChange={(value) => onPerPageChange(Number(value))}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {perPageOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={!canGoPrevious || isLoading}
          >
            <ChevronsLeft size={16} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canGoPrevious || isLoading}
          >
            <ChevronLeft size={16} />
          </Button>

          <div className="flex items-center gap-1 px-2">
            <span className="text-sm text-slate-600">
              Page <span className="font-medium">{currentPage}</span> of{' '}
              <span className="font-medium">{lastPage || 1}</span>
            </span>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canGoNext || isLoading}
          >
            <ChevronRight size={16} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(lastPage)}
            disabled={!canGoNext || isLoading}
          >
            <ChevronsRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Hook for managing pagination state (for mock/local data)
export function usePagination<T>(items: T[], initialPerPage: number = 5): 
{
  paginatedItems: T[];
  pagination: PaginationMeta;
  currentPage: number;
  perPage: number;
  setCurrentPage: (page: number) => void;
  setPerPage: (perPage: number) => void;
} {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(initialPerPage);

  const total = items.length;
  const lastPage = Math.ceil(total / perPage) || 1;
  
  // Reset to page 1 if current page exceeds last page
  React.useEffect(() => {
    if (currentPage > lastPage) {
      setCurrentPage(1);
    }
  }, [currentPage, lastPage]);

  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedItems = items.slice(startIndex, endIndex);

  const from = total === 0 ? null : startIndex + 1;
  const to = total === 0 ? null : Math.min(endIndex, total);

  return {
    paginatedItems,
    pagination: {
      currentPage,
      lastPage,
      perPage,
      total,
      from,
      to,
    },
    currentPage,
    perPage,
    setCurrentPage,
    setPerPage,
  };
}

export default PaginationControls;
