import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { getManagerMobilePage } from './manager-mobile-navigation';

export function ManagerMobilePageHeader({
  accountBranchName,
  branchName,
  branchSelector,
  page,
}: {
  accountBranchName: string;
  branchName: string;
  branchSelector?: ReactNode;
  page: ReturnType<typeof getManagerMobilePage>;
}) {
  return (
    <div className="manager-mobile-page-header">
      <div className="manager-mobile-page-header__title">
        {page.parent && (
          <Link aria-label="상위 페이지" to={page.parent}>
            <ChevronLeft aria-hidden="true" size={20} />
          </Link>
        )}
        <h1>{page.title}</h1>
      </div>
      <div className="manager-mobile-page-header__branch">
        {page.personal ? (
          <span title={accountBranchName}>소속 · {accountBranchName}</span>
        ) : (
          (branchSelector ?? <span title={branchName}>{branchName}</span>)
        )}
      </div>
    </div>
  );
}
