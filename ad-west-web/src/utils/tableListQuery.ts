export function appendSortQuery(
  params: URLSearchParams,
  sort?: { sortBy?: string; sortDir?: 'asc' | 'desc' },
) {
  if (sort?.sortBy) {
    params.set('sortBy', sort.sortBy);
    params.set('sortDir', sort.sortDir ?? 'asc');
  }
}
