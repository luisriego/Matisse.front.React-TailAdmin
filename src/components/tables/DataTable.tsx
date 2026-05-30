import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";

export interface ColumnDef<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  key: string;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  /** Tabela ocupa 100% do contentor (evita faixa vazia ao lado em painéis embutidos). */
  fullWidth?: boolean;
}

export default function DataTable<T extends { id: string | number }>({
  data,
  columns,
  fullWidth = false,
}: DataTableProps<T>) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] ${fullWidth ? "w-full overflow-visible" : "overflow-hidden"}`}
    >
      <div className={`${fullWidth ? "w-full overflow-x-auto" : "max-w-full overflow-x-auto"}`}>
        <Table
          className={
            fullWidth ? "w-full min-w-[800px] table-auto border-collapse" : undefined
          }
        >
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  isHeader
                  className={`px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 ${column.className || ''}`}>
                  {column.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {data.map((row, index) => (
              <TableRow key={row.id ? String(row.id) : `row-${index}`}>
                {columns.map((column) => (
                  <TableCell key={`${row.id ? String(row.id) : `row-${index}`}-${column.key}`} className={`px-5 py-4 sm:px-6 ${column.className || ''}`}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
