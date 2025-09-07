import { useState, useMemo } from 'react';

interface UseSearchOptions<T> {
  searchFields?: (keyof T)[];
  initialQuery?: string;
}

/**
 * Custom hook for search/filter functionality
 */
export function useSearch<T extends object>(
  items: T[],
  options: UseSearchOptions<T> = {},
): {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredItems: T[];
} {
  const { searchFields, initialQuery = '' } = options;
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return items;
    }

    const query = searchQuery.toLowerCase();

    return items.filter((item) => {
      if (searchFields) {
        // Search in specified fields
        return searchFields.some((field) => {
          const value = item[field];
          return value && String(value).toLowerCase().includes(query);
        });
      } else {
        // Search in all string fields
        return Object.values(item).some(
          (value) => typeof value === 'string' && value.toLowerCase().includes(query),
        );
      }
    });
  }, [items, searchQuery, searchFields]);

  return {
    searchQuery,
    setSearchQuery,
    filteredItems,
  };
}
