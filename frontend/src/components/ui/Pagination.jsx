// PALNARIUM-style numbered pagination: "1 2 3 … 10", current page underlined.
const pagesToShow = (page, pageCount) => {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const set = new Set([1, pageCount, page - 1, page, page + 1]);
  const pages = [...set].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const out = [];
  pages.forEach((p, i) => {
    if (i && p - pages[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
};

export const Pagination = ({ page, pageCount, onChange }) => {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-3.5 pt-6 font-display text-label">
      {pagesToShow(page, pageCount).map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="text-ink-2" aria-hidden="true">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={p === page ? 'text-ink underline underline-offset-4' : 'text-ink-2 hover:text-ink'}
          >
            {p}
          </button>
        )
      )}
    </nav>
  );
};
