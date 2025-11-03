import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ITool } from "@/types/tool"
import { IToolCategory } from "@/types/tool-category"
import { ToolRowActions } from "@/components/settings/tool-actions"
import AsyncDataTable from "@/components/ui/data-table/async-data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import { DivergentColumn } from "@/types/table"

interface CategorySectionProps {
  category: IToolCategory | null
  totalCount?: number
  selectedTools: ITool[]
  onToggleAll: (tools: ITool[], checked: boolean) => void
  onToggleTool: (tool: ITool, checked: boolean) => void
  defaultOpen?: boolean
  refetchTrigger?: number
}

export function CategorySection({
  category,
  totalCount = 0,
  selectedTools,
  onToggleAll,
  onToggleTool,
  defaultOpen = true,
  refetchTrigger,
}: CategorySectionProps) {
  const { t } = useTranslation("settings")
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const tableRef = useRef<any>(null)

  const categoryName = category?.display_name || t("tools.uncategorized", "Uncategorized")
  const categoryDescription = category?.description || ""

  // Build endpoint with category filter using paginator's filter parameter
  const endpoint = useMemo(() => {
    if (category?.id) {
      // Use filter parameter format: [{"id":"category_id","value":"1"}]
      const filter = JSON.stringify([{ id: "category_id", value: category.id.toString() }])
      return `/tools?filter=${encodeURIComponent(filter)}`
    } else {
      // For uncategorized tools, use "null" value which paginator will convert to IS NULL
      const filter = JSON.stringify([{ id: "category_id", value: "null" }])
      return `/tools?filter=${encodeURIComponent(filter)}`
    }
  }, [category?.id])

  // Define columns for the table
  const columns: DivergentColumn<ITool, string>[] = useMemo(() => [
    {
      id: "select",
      header: ({ table }: any) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value: any) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }: any) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value: any) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "display_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("tools.display_name", "Display Name")} />
      ),
      title: t("tools.display_name", "Display Name"),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("tools.name", "Name")} />
      ),
      title: t("tools.name", "Name"),
      cell: ({ row }) => (
        <code className="text-sm bg-muted px-2 py-1 rounded">
          {row.original.name}
        </code>
      ),
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("tools.description_field", "Description")} />
      ),
      title: t("tools.description_field", "Description"),
      cell: ({ row }) => (
        <div className="max-w-xs truncate" title={row.original.description}>
          {row.original.description}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("tools.type", "Type")} />
      ),
      title: t("tools.type", "Type"),
      cell: ({ row }) => (
        <Badge variant="outline">
          {t(`tools.types.${row.original.type}`, row.original.type)}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => <ToolRowActions row={row} />,
    },
  ], [t])

  // Track which tools have been loaded in this category's table
  const loadedToolIdsRef = useRef<Set<number>>(new Set())

  // Handle selected rows change from table
  const handleSelectedRowsChange = useCallback((rows: ITool[]) => {
    // Get all tools currently loaded in this table
    if (tableRef.current) {
      // DÜZELTME:
      // TypeScript'in `row.original.id`'nin `any` olduğunu düşünmesini engellemek için
      // Set'i oluştururken `Set<number>` olarak tipini açıkça belirtiyoruz.
      const currentPageToolIds = new Set<number>(
        tableRef.current.getRowModel().flatRows.map((row: any) => row.original.id)
      )

      // Update our reference of loaded tools
      loadedToolIdsRef.current = new Set([...loadedToolIdsRef.current, ...currentPageToolIds])
    }

    // Remove all tools from this category that we know about
    const otherCategorySelections = selectedTools.filter(
      (tool) => !loadedToolIdsRef.current.has(tool.id)
    )

    // Add the newly selected rows from this category
    const newSelections = [...otherCategorySelections, ...rows]
    onToggleAll(newSelections, true)
  }, [selectedTools, onToggleAll])

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <div className="rounded-lg border">
        <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            {isOpen ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{categoryName}</h3>
                <Badge variant="secondary">{totalCount}</Badge>
              </div>
              {categoryDescription && (
                <p className="text-sm text-muted-foreground mt-1">
                  {categoryDescription}
                </p>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t">
            <AsyncDataTable
              columns={columns}
              endpoint={endpoint}
              selectable={true}
              onSelectedRowsChange={handleSelectedRowsChange}
              tableRef={tableRef}
              initialPageSize={10}
              refetchTrigger={refetchTrigger}
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
