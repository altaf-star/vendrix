import { FiStar } from 'react-icons/fi';

export default function StarRating({ rating = 0, max = 5, size = 'md', interactive = false, onChange }) {
  const sizes = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5' };
  const cls = sizes[size] || sizes.md;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.floor(rating);
        const partial = !filled && i < rating;

        return (
          <button
            key={i}
            type={interactive ? 'button' : undefined}
            onClick={interactive ? () => onChange?.(i + 1) : undefined}
            className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
            aria-label={interactive ? `Rate ${i + 1} star${i !== 0 ? 's' : ''}` : undefined}
          >
            <FiStar
              className={`${cls} transition-colors ${
                filled || partial
                  ? 'fill-amber-400 text-amber-400'
                  : interactive
                  ? 'text-gray-300 hover:text-amber-300'
                  : 'text-gray-300'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
