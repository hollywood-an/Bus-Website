import { useEffect, useRef, useState } from 'react';
import { getClientId } from '../lib/clientId';

// Google-Maps-style typeahead over /api/suggest (curated campus spots first, then Places
// autocomplete biased to campus). Suggestions are display strings: picking one fills the input
// and the server geocoder resolves the text when the trip is planned.
const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;

export default function SuggestInput({ value, onChange, onSelect, onEnter, placeholder, ariaLabel, inputRef, className }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(-1);
  const seqRef = useRef(0); // drops stale fetch responses
  const skipRef = useRef(false); // suppress the refetch caused by picking a suggestion
  const focusedRef = useRef(false); // only fetch/open while the user is actually in the field

  useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }
    // A persisted value re-mounts with text in the field (e.g. returning to the Planner view);
    // without focus that must not pop the dropdown.
    if (!focusedRef.current) return;
    const q = value.trim();
    if (q.length < MIN_CHARS) {
      setItems([]);
      setOpen(false);
      setActive(-1);
      return;
    }
    const seq = ++seqRef.current;
    const t = setTimeout(() => {
      fetch(`/api/suggest?q=${encodeURIComponent(q)}`, { headers: { 'x-client-id': getClientId() } })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (seq !== seqRef.current || !d) return;
          const list = Array.isArray(d.suggestions) ? d.suggestions : [];
          setItems(list);
          setOpen(list.length > 0);
          setActive(-1);
        })
        .catch(() => {});
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value]);

  const pick = (item) => {
    skipRef.current = true;
    setOpen(false);
    setItems([]);
    setActive(-1);
    onSelect(item.text);
  };

  const onKeyDown = (e) => {
    if (!open || items.length === 0) {
      if (e.key === 'Enter') onEnter?.();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === 'Enter') {
      // Standard combobox semantics: Enter commits YOUR text unless you explicitly arrowed onto a
      // suggestion. Auto-committing item #0 silently replaced typed addresses.
      if (active >= 0) {
        e.preventDefault();
        pick(items[active]);
      } else {
        setOpen(false);
        onEnter?.();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          focusedRef.current = false;
          setOpen(false);
        }}
        onFocus={() => {
          focusedRef.current = true;
          if (items.length > 0 && value.trim().length >= MIN_CHARS) setOpen(true);
        }}
        placeholder={placeholder}
        className={className}
      />
      {open && (
        <ul
          role="listbox"
          aria-label={`${ariaLabel} suggestions`}
          className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-line bg-surface shadow-[var(--shadow-float)]"
        >
          {items.map((s, i) => (
            <li key={`${s.source}-${s.main}-${i}`} role="option" aria-selected={i === active}>
              {/* mousedown (not click) so the pick beats the input's blur-close */}
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex min-h-11 w-full items-baseline gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                  i === active ? 'bg-surface-2' : 'bg-surface'
                }`}
              >
                <span className="min-w-0 truncate font-semibold text-ink">{s.main}</span>
                {s.secondary && <span className="shrink-0 text-[12px] text-muted">{s.secondary}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
