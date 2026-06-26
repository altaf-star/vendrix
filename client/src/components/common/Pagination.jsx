import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function Pagination({ page, pages, onPageChange }) {
  if (pages <= 1) return null;

  const range = [];
  const delta = 2;
  for (let i = Math.max(1, page - delta); i <= Math.min(pages, page + delta); i++) {
    range.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="btn-secondary btn-sm px-2.5 disabled:opacity-40"
      >
        <FiChevronLeft className="w-4 h-4" />
      </button>

      {range[0] > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className="btn-secondary btn-sm w-9">1</button>
          {range[0] > 2 && <span className="text-gray-400 px-1">…</span>}
        </>
      )}

      {range.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`btn-sm w-9 ${p === page ? 'btn-primary' : 'btn-secondary'}`}
        >
          {p}
        </button>
      ))}

      {range[range.length - 1] < pages && (
        <>
          {range[range.length - 1] < pages - 1 && <span className="text-gray-400 px-1">…</span>}
          <button onClick={() => onPageChange(pages)} className="btn-secondary btn-sm w-9">{pages}</button>
        </>
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === pages}
        className="btn-secondary btn-sm px-2.5 disabled:opacity-40"
      >
        <FiChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
