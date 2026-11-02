import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";

function pageHref(basePath: string, params: Record<string, string | undefined>, page: number): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  search.set("page", String(page));
  return `${basePath}?${search.toString()}`;
}

/** Link-based pagination for server-rendered admin list pages — no client state, just ?page= in the URL. */
export function AdminPagination({
  basePath,
  params = {},
  page,
  totalPages,
}: {
  basePath: string;
  params?: Record<string, string | undefined>;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = Array.from(pages).sort((a, b) => a - b);

  return (
    <Pagination className="justify-start">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={pageHref(basePath, params, Math.max(1, page - 1))}
            className={page <= 1 ? "pointer-events-none opacity-40" : ""}
          />
        </PaginationItem>

        {sorted.map((p, i) => (
          <PaginationItem key={p}>
            {i > 0 && sorted[i - 1] !== p - 1 && <PaginationEllipsis />}
            <PaginationLink href={pageHref(basePath, params, p)} isActive={p === page}>
              {p}
            </PaginationLink>
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            href={pageHref(basePath, params, Math.min(totalPages, page + 1))}
            className={page >= totalPages ? "pointer-events-none opacity-40" : ""}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
