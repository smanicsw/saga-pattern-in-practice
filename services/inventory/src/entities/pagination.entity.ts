export type CursorPaginationQuery = {
  limit: number;
  cursor?: string;
};

export type CursorPagination = {
  limit: number;
  nextCursor: string | null;
};
