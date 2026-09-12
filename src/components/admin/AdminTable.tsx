import * as React from 'react';

/** Admin: highest information density in the app. Small rows, no cards. */
export function AdminTable<T extends { id: string }>({
  columns, rows, onRowClick,
}: {
  columns: Array<{ key: string; header: string; width?: string; align?: 'left' | 'right'; render: (row: T) => React.ReactNode }>;
  rows: T[];
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-edge-subtle">
      <table className="w-full border-collapse text-body-sm">
        <thead>
          <tr className="bg-surface-2">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                style={{ width: c.width }}
                className={'whitespace-nowrap px-3 py-2 text-label font-[550] text-ink-secondary ' + (c.align === 'right' ? 'text-right' : 'text-left')}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={(e) => e.key === 'Enter' && onRowClick?.(row)}
              className={'border-t border-edge-subtle ' + (onRowClick ? 'cursor-pointer hover:bg-surface-2' : '')}
            >
              {columns.map((c) => (
                <td key={c.key} className={'px-3 py-2 align-middle text-ink ' + (c.align === 'right' ? 'text-right tabular' : '')}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
