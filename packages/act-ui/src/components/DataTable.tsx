import * as React from "react";
import { cn } from "../utils/cn";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> extends React.HTMLAttributes<HTMLDivElement> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  keyField?: string;
}

function DataTableInner<T extends Record<string, unknown>>(
  {
    columns,
    data,
    emptyMessage = "No data",
    onRowClick,
    keyField = "id",
    className,
    ...props
  }: DataTableProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  return (
    <div
      ref={ref}
      className={cn("rounded-xl border bg-card shadow overflow-hidden", className)}
      {...props}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-left font-medium text-muted-foreground",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={String(row[keyField] ?? i)}
                className={cn(
                  "border-b last:border-0 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-muted/30"
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3", col.className)}>
                    {col.render
                      ? col.render(row)
                      : String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const DataTable = React.forwardRef(DataTableInner) as <
  T extends Record<string, unknown>
>(
  props: DataTableProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => React.ReactElement;

export { DataTable };
