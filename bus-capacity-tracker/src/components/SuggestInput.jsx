import { useEffect, useId, useRef, useState } from 'react';
import { getClientId } from '../lib/clientId';
import { apiUrl } from '../lib/api';

// Google-Maps-style typeahead over /api/suggest (curated campus spots first, then Places
// autocomplete biased to campus). Suggestions are display strings: picking one fills the input
// and the server geocoder resolves the text when the trip is planned.
const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;

// `topAction` (optional): a pinned first row shown whenever the dropdown is open — even before any
// text is typed (the field opens on focus). Used for the planner's persistent "Your location"
// origin, Google-Maps-style: { label, onPick }.
export default function SuggestInput({ value, onChange, onSelect, onEnter, placeholder, ariaLabel, inputRef, className, topAction }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(-1);
  const uid = useId(); // wires the ARIA combobox pattern: input ↔ listbox ↔ active option (audit D7)
  const listboxId = `${uid}-listbox`;
  const seqRef = useRef(0); // drops stale fetch responses
  const skipRef = useRef(false); // suppress the refetch caused by picking a suggestion
  const focusedRef = useRef(false); // only fetch/open while the user is actually in the field
  const offset = topAction ? 1 : 0; // keyboard nav treats the pinned row as index 0
  // The fetch effect only cares whether a pinned row exists (a boolean), not the object identity —
  // parents pass a fresh object literal every render, which must not re-fire the effect.
  const hasTopAction = Boolean(topAction);

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
      setOpen(hasTopAction); // the pinned row stays available even with no text
      setActive(-1);
      return;
    }
    const seq = ++seqRef.current;
    const t = setTimeout(() => {
      fetch(apiUrl(`/api/suggest?q=${encodeURIComponent(q)}`), { headers: { 'x-client-id': getClientId() } })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (seq !== seqRef.current || !d) return;
          const list = Array.isArray(d.suggestions) ? d.suggestions : [];
          setItems(list);
          setOpen(list.length > 0 || hasTopAction);
          setActive(-1);
        })
        .catch(() => {});
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value, hasTopAction]);

  const pick = (item) => {
    skipRef.current = true;
    setOpen(false);
    setItems([]);
    setActive(-1);
    onSelect(item.text);
  };

  const pickTop = () => {
    skipRef.current = true; // the parent will set the field's text; don't refetch suggestions for it
    setOpen(false);
    setItems([]);
    setActive(-1);
    topAction.onPick();
  };

  const optionCount = items.length + offset;
  const onKeyDown = (e) => {
    if (!open || optionCount === 0) {
      if (e.key === 'Enter') onEnter?.();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % optionCount);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a <= 0 ? optionCount - 1 : a - 1));
    } else if (e.key === 'Enter') {
      // Standard combobox semantics: Enter commits YOUR text unless you explicitly arrowed onto a
      // suggestion. Auto-committing item #0 silently replaced typed addresses.
      if (active >= 0) {
        e.preventDefault();
        if (topAction && active === 0) pickTop();
        else pick(items[active - offset]);
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
        aria-controls={listboxId}
        aria-activedescendant={open && active >= 0 ? `${uid}-opt-${active}` : undefined}
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
          if (topAction || (items.length > 0 && value.trim().length >= MIN_CHARS)) setOpen(true);
        }}
        placeholder={placeholder}
        className={className}
      />
      {/* Screen readers hear the list arrive; sighted users see it. */}
      <span className="sr-only" aria-live="polite">
        {open ? `${items.length} suggestion${items.length === 1 ? '' : 's'} available` : ''}
      </span>
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={`${ariaLabel} suggestions`}
          className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-line bg-surface shadow-[var(--shadow-float)]"
        >
          {topAction && (
            <li key="top-action" id={`${uid}-opt-0`} role="option" aria-selected={active === 0}>
              {/* mousedown (not click) so the pick beats the input's blur-close */}
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickTop();
                }}
                onMouseEnter={() => setActive(0)}
                className={`flex min-h-11 w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                  active === 0 ? 'bg-surface-2' : 'bg-surface'
                }`}
              >
                {/* Google's blue "current location" affordance — instantly recognizable */}
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full" style={{ backgroundColor: '#4285F422' }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#4285F4' }} />
                </span>
                <span className="font-semibold" style={{ color: '#1a63d8' }}>
                  {topAction.label}
                </span>
              </button>
            </li>
          )}
          {items.map((s, i) => (
            <li key={`${s.source}-${s.main}-${i}`} id={`${uid}-opt-${i + offset}`} role="option" aria-selected={i + offset === active}>
              {/* mousedown (not click) so the pick beats the input's blur-close */}
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                onMouseEnter={() => setActive(i + offset)}
                className={`flex min-h-11 w-full items-baseline gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                  i + offset === active ? 'bg-surface-2' : 'bg-surface'
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
