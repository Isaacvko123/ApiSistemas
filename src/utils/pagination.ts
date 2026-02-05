type PaginationOptions = {
  defaultPageSize?: number;
  maxPageSize?: number;
};

export type PaginationParams = {
  page: number;
  pageSize: number;
  skip?: number;
  take?: number;
};

export function parsePagination(
  query: Record<string, unknown>,
  options: PaginationOptions = {},
): PaginationParams {
  const pageRaw =
    typeof query.page === "string"
      ? Number(query.page)
      : typeof query.page === "number"
        ? query.page
        : undefined;
  const pageSizeRaw =
    typeof query.pageSize === "string"
      ? Number(query.pageSize)
      : typeof query.pageSize === "number"
        ? query.pageSize
        : undefined;

  const page =
    Number.isFinite(pageRaw) && (pageRaw as number) > 0
      ? Math.floor(pageRaw as number)
      : 1;

  const defaultPageSize = options.defaultPageSize ?? 50;
  const maxPageSize = options.maxPageSize ?? 100;

  const rawSize =
    Number.isFinite(pageSizeRaw) && (pageSizeRaw as number) > 0
      ? Math.floor(pageSizeRaw as number)
      : defaultPageSize;

  const pageSize = Math.min(rawSize, maxPageSize);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
