import { ChevronLeft, ChevronRight } from 'lucide-react';

type AdminMembersPaginationProps = {
  end: number;
  onPageChange: (page: number) => void;
  page: number;
  pageCount: number;
  start: number;
  total: number;
};

export function AdminMembersPagination({
  end,
  onPageChange,
  page,
  pageCount,
  start,
  total,
}: AdminMembersPaginationProps) {
  return (
    <nav aria-label="사원 목록 페이지" className="admin-members__pagination">
      <p
        aria-label={`전체 ${total}명 중 ${start}–${end}명`}
        className="admin-members__page-range"
        role="status"
      >
        <strong>
          {start}–{end}
        </strong>{' '}
        / {total}명
      </p>
      <div className="admin-members__page-controls">
        <button
          aria-label="이전 페이지"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={16} />
          이전
        </button>
        <span aria-label={`${pageCount}페이지 중 ${page}페이지`}>
          {page} / {pageCount}
        </span>
        <button
          aria-label="다음 페이지"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          다음
          <ChevronRight aria-hidden="true" size={16} />
        </button>
      </div>
    </nav>
  );
}
