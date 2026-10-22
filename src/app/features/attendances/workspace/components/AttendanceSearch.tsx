import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Search, X } from 'lucide-react';
import { AppShellHeaderControl } from '../../../../shared/layout/AppShell/AppShellHeaderControl';

const mobileQuery = '(max-width: 768px)';
const subscribeMobile = (onChange: () => void) => {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
const getMobileSnapshot = () => window.matchMedia(mobileQuery).matches;
const getServerSnapshot = () => false;

type AttendanceSearchProps = {
  enabled: boolean;
  onQueryChange: (query: string) => void;
  query: string;
  searchId: string;
};

export function AttendanceSearch({
  enabled,
  onQueryChange,
  query,
  searchId,
}: AttendanceSearchProps) {
  const mobile = useSyncExternalStore(
    subscribeMobile,
    getMobileSnapshot,
    getServerSnapshot,
  );
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocus = useRef(false);

  useLayoutEffect(() => {
    if (mobile && open) {
      inputRef.current?.focus();
      returnFocus.current = true;
    } else if (returnFocus.current) {
      document.getElementById(searchId)?.focus();
      returnFocus.current = false;
    }
  }, [mobile, open, searchId]);

  const closeSearch = () => {
    // Toggling an empty search must not clear the board's current selection.
    if (query !== '') onQueryChange('');
    setOpen(false);
  };

  const field = (
    <label className="attendance-toolbar__search" htmlFor={searchId}>
      <span className="staff-attendance__sr-only">사원 검색</span>
      <Search aria-hidden="true" size={17} />
      <input
        autoComplete="off"
        disabled={!enabled}
        enterKeyHint="search"
        id={searchId}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (!mobile) return;
          if (event.key === 'Escape') {
            event.preventDefault();
            closeSearch();
          } else if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
        placeholder="이름·좌석 검색"
        ref={inputRef}
        type="search"
        value={query}
      />
    </label>
  );

  if (!mobile) return field;

  return (
    <AppShellHeaderControl>
      <div className="attendance-header-search" data-expanded={open}>
        {open ? (
          <>
            {field}
            <button
              aria-label="검색어 지우고 검색 닫기"
              onClick={closeSearch}
              type="button"
            >
              <X aria-hidden="true" size={20} />
            </button>
          </>
        ) : (
          <button
            aria-label={
              query ? `사원 검색 열기, 검색어: ${query}` : '사원 검색 열기'
            }
            aria-expanded={false}
            className={query ? 'is-filtered' : undefined}
            disabled={!enabled}
            id={searchId}
            onClick={() => setOpen(true)}
            type="button"
          >
            <Search aria-hidden="true" size={20} />
          </button>
        )}
      </div>
    </AppShellHeaderControl>
  );
}
