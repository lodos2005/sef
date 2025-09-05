"use client"

import {
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import { FolderOpen } from "lucide-react"
import * as React from "react"
import { useTranslation } from "react-i18next"

import { http } from "@/services"
import { DataTablePagination } from "@/components/ui/data-table/data-table-pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DivergentColumn } from "@/types/table"
import { useDebounce } from "@/lib/debounce"

import { Skeleton } from "../skeleton"
import { DataTableToolbar } from "./data-table-toolbar"

interface AsyncDataTableResponse<T> {
  total_records: number
  records: T[]
  current_page: number
  total_pages: number
}

interface AsyncDataTableProps<TData, TValue> {
  columns: DivergentColumn<TData, TValue>[]
  endpoint: string
  loading?: boolean
  selectable?: boolean
  onSelectedRowsChange?: (rows: TData[]) => void
  children?: React.ReactNode
  tableRef?: any
  initialPageSize?: number
  refetchTrigger?: number
}

const AsyncDataTable = <TData, TValue>({
  columns,
  endpoint,
  loading: externalLoading = false,
  selectable,
  onSelectedRowsChange,
  children,
  tableRef,
  initialPageSize = 10,
  refetchTrigger,
}: AsyncDataTableProps<TData, TValue>) => {
  const [tableState, setTableState] = React.useState({
    rowSelection: {},
    globalFilter: "",
    columnVisibility: {} as VisibilityState,
    columnFilters: [] as ColumnFiltersState,
    sorting: [] as SortingState,
  })
  const [data, setData] = React.useState<TData[]>([])
  const [loading, setLoading] = React.useState<boolean>(true)
  const [pagination, setPagination] = React.useState({
    totalRecords: 0,
    currentPage: 1,
    totalPages: 1,
    pageSize: initialPageSize,
  })
  const [debouncedGlobalFilter, setDebouncedGlobalFilter] = React.useState("")
  const [debouncedColumnFilters, setDebouncedColumnFilters] = React.useState<ColumnFiltersState>([])

  const { t } = useTranslation("components")

  const debouncedSetGlobalFilter = useDebounce((value: string) => {
    setDebouncedGlobalFilter(value)
  }, 300)

  const debouncedSetColumnFilters = useDebounce((filters: ColumnFiltersState) => {
    setDebouncedColumnFilters(filters)
  }, 300)

  const params = React.useMemo(() => {
    const p: any = {
      page: pagination.currentPage,
      per_page: pagination.pageSize,
    }

    // Handle sorting
    if (tableState.sorting.length > 0) {
      const sort = tableState.sorting[0]
      const direction = sort.desc ? '-' : '+'
      p.order = `${direction}${sort.id}`
    }

    // Handle filters
    const filters: { id: string; value: string }[] = []

    // Global search
    if (debouncedGlobalFilter) {
      p.search = debouncedGlobalFilter
    }

    // Column filters
    debouncedColumnFilters.forEach(filter => {
      if (filter.value) {
        filters.push({ id: filter.id, value: String(filter.value) })
      }
    })

    if (filters.length > 0) {
      p.filter = JSON.stringify(filters)
    }

    return p
  }, [pagination.currentPage, pagination.pageSize, tableState.sorting, debouncedGlobalFilter, debouncedColumnFilters])

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    try {
      const response = await http.get<AsyncDataTableResponse<TData>>(endpoint, { params })
      setData(response.data.records)
      setPagination(prev => ({
        ...prev,
        totalRecords: response.data.total_records,
        currentPage: response.data.current_page,
        totalPages: response.data.total_pages,
      }))
    } catch (error) {
      console.error('Error fetching data:', error)
      setData([])
      setPagination(prev => ({ ...prev, totalRecords: 0 }))
    } finally {
      setLoading(false)
    }
  }, [endpoint, params])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  React.useEffect(() => {
    if (refetchTrigger !== undefined) {
      fetchData()
    }
  }, [refetchTrigger, fetchData])

  const table = useReactTable({
    data,
    //@ts-ignore
    columns,
    state: {
      ...tableState,
      pagination: {
        pageIndex: pagination.currentPage - 1,
        pageSize: pagination.pageSize,
      },
    },
    enableRowSelection: selectable,
    onRowSelectionChange: (updater) =>
      setTableState(prev => ({
        ...prev,
        rowSelection: typeof updater === 'function' ? updater(prev.rowSelection) : updater,
      })),
    onSortingChange: (updater) =>
      setTableState(prev => ({
        ...prev,
        sorting: typeof updater === 'function' ? updater(prev.sorting) : updater,
      })),
    onGlobalFilterChange: (updater) => {
      const newValue = typeof updater === 'function' ? updater(tableState.globalFilter) : updater
      setTableState(prev => ({ ...prev, globalFilter: newValue }))
      debouncedSetGlobalFilter(newValue)
    },
    onColumnFiltersChange: (updater) => {
      const newFilters = typeof updater === 'function' ? updater(tableState.columnFilters) : updater
      setTableState(prev => ({ ...prev, columnFilters: newFilters }))
      debouncedSetColumnFilters(newFilters)
    },
    onColumnVisibilityChange: (updater) =>
      setTableState(prev => ({
        ...prev,
        columnVisibility: typeof updater === 'function' ? updater(prev.columnVisibility) : updater,
      })),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: pagination.totalPages,
    onPaginationChange: (updater) => {
      const newState = typeof updater === 'function' ? updater({ pageIndex: pagination.currentPage - 1, pageSize: pagination.pageSize }) : updater
      setPagination(prev => ({
        ...prev,
        currentPage: newState.pageIndex + 1,
        pageSize: newState.pageSize,
      }))
    },
  })

  if (tableRef) {
    tableRef.current = table
  }

  React.useEffect(() => {
    if (onSelectedRowsChange) {
      onSelectedRowsChange(
        table.getSelectedRowModel().flatRows.map((row) => row.original)
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableState.rowSelection])

  React.useEffect(() => {
    const newColumnVisibility = { ...tableState.columnVisibility };

    columns.forEach((column: any) => {
      const meta = column.meta;
      if (meta && meta.hidden) {
        newColumnVisibility[column.accessorKey] = false;
      }
    });

    setTableState(prev => ({ ...prev, columnVisibility: newColumnVisibility }));
  }, [columns]);

  const clearServerFilters = React.useCallback(() => {
    setTableState({
      rowSelection: {},
      globalFilter: "",
      columnVisibility: tableState.columnVisibility,
      columnFilters: [],
      sorting: [],
    })
    setDebouncedGlobalFilter("")
    setDebouncedColumnFilters([])
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }, [tableState.columnVisibility])

  return (
    <div className="data-table space-y-4">
      <div className="flex items-center justify-between">
        <div className="pl-8">{children}</div>
        <DataTableToolbar
          table={table}
          columns={columns}
          globalFilter={tableState.globalFilter}
          setGlobalFilter={(value) => {
            setTableState(prev => ({ ...prev, globalFilter: value }))
            debouncedSetGlobalFilter(value)
          }}
          isServerSide={true}
          serverGlobalFilter={tableState.globalFilter}
          serverColumnFilters={tableState.columnFilters}
          onClearServerFilters={clearServerFilters}
        />
      </div>

      <div className="border-y">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {(loading || externalLoading) && (
              <>
                {[...Array(10)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(columns.length)].map((_, t) => (
                      <TableCell key={t}>
                        <Skeleton className="h-[20px] w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            )}
            {!loading && !externalLoading && (
              <>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-72 text-center"
                    >
                      <FolderOpen className="mx-auto mb-2 size-12 text-black/50 dark:text-white/80" />
                      {t("table.no_records")}
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} selectable={selectable} totalRecords={pagination.totalRecords} />
    </div>
  )
}

export default AsyncDataTable
