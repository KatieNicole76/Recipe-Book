import { X } from 'lucide-react';

function Pill({ label, active, onClick, onRemove }) {
  const handleKeyDown = (e) => {
    if (!onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <span
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`shrink-0 px-2 rounded-full text-body-2 border border-blue flex items-center gap-1 ${
        onClick ? 'cursor-pointer' : ''
      } ${active ? 'bg-blue text-white' : 'bg-transparent text-blue'}`}>
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${label}`}
          className="cursor-pointer flex items-center justify-center"
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
}

export default Pill;