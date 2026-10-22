import type { ReactNode } from "react";

export function CollectionEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="collection-empty-state">
      <span className="collection-empty-icon" aria-hidden="true">
        {icon}
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <div className="collection-empty-action">{action}</div>}
    </div>
  );
}
