import React, { useMemo } from "react";

// Helper function to compute score from ratings
const computeScore = (ratings = []) => {
  if (!ratings || ratings.length === 0) return 0;
  const sum = ratings.reduce((s, v) => s + v, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
};

// Escape regex special chars
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightedTitle({ title = "", query = "" }) {
  if (!query) return <>{title}</>;
  const q = query.trim();
  if (!q) return <>{title}</>;
  const re = new RegExp(escapeRegex(q), "ig");
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = re.exec(title)) !== null) {
    const start = match.index;
    const end = re.lastIndex;
    if (start > lastIndex) parts.push({ text: title.slice(lastIndex, start), match: false });
    parts.push({ text: title.slice(start, end), match: true });
    lastIndex = end;
    // avoid infinite loops for zero-length matches
    if (re.lastIndex === match.index) re.lastIndex++;
  }
  if (lastIndex < title.length) parts.push({ text: title.slice(lastIndex), match: false });

  return (
    <>
      {parts.map((p, i) =>
        p.match ? (
          <span key={i} className="text-black dark:text-white font-semibold">
            {p.text}
          </span>
        ) : (
          <span key={i} className="text-gray-600 dark:text-gray-300">
            {p.text}
          </span>
        )
      )}
    </>
  );
}

const StarIcon = ({ className = "w-4 h-4 inline-block mr-1 text-yellow-400" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 17.27L18.18 21 16.54 13.97 22 9.24 14.81 8.63 12 2 9.19 8.63 2 9.24 7.46 13.97 5.82 21z" />
  </svg>
);

const CloseIcon = ({ onClick }) => (
  <button onClick={onClick} aria-label="Cerrar" className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">
    <svg className="w-5 h-5 text-gray-600 dark:text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  </button>
);

export default function Suggestions({ query = "", visible = true, inputWidth = null, onClose = () => {}, onSelect = () => {} }) {
  // compute filtered suggestions
  const suggestions = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) {
      // hide suggestions when there's no query
      return [];
    }

    // Note: suggestions would come from backend FAQs in a real implementation
    // For now, returning empty array
    return [];
  }, [query]);

  if (!visible) return null;
  // also hide when query is empty (defensive)
  if (!query || !query.trim()) return null;

  return (
    // position absolute relative to the chatbox input container so it stays aligned and constrained
    <div className="absolute left-0 right-0 bottom-full mb-3 z-50 flex justify-center pointer-events-auto px-3">
      <div
        style={{ width: inputWidth ? inputWidth : undefined, maxWidth: "calc(100% - 24px)" }}
        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden w-full max-w-xl"
      >
        <div className="flex items-center justify-between px-4 py-2">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Resultados sugeridos</div>
          <div>
            <CloseIcon onClick={onClose} />
          </div>
        </div>
        <div className="border-t border-gray-100 dark:border-slate-700"></div>
        <div className="max-h-56 overflow-y-auto">
          {suggestions.length === 0 && (
            <div className="p-4 text-sm text-gray-500">No se encontraron sugerencias.</div>
          )}

          {suggestions.map((faq) => (
            <button
              key={faq.id}
              onClick={() => onSelect(faq)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-start gap-3"
            >
              <div className="flex-1">
                <div className="text-sm leading-tight">
                  <HighlightedTitle title={faq.title} query={query} />
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-300 flex items-center gap-3">
                  <span className="flex items-center">
                    <StarIcon /> <span className="ml-1 font-medium text-gray-700 dark:text-white">{computeScore(faq.ratings)}</span>
                  </span>
                  <span>•</span>
                  <span>{(faq.comments || []).length} comentarios</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
