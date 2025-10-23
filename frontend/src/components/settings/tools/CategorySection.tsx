import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ITool } from "@/types/tool"
import { IToolCategory } from "@/types/tool-category"
import { ToolRowActions } from "@/components/settings/tool-actions"

interface CategorySectionProps {
  category: IToolCategory | null
  tools: ITool[]
  selectedTools: ITool[]
  onToggleAll: (tools: ITool[], checked: boolean) => void
  onToggleTool: (tool: ITool, checked: boolean) => void
  defaultOpen?: boolean
}

export function CategorySection({
  category,
  tools,
  selectedTools,
  onToggleAll,
  onToggleTool,
  defaultOpen = true,
}: CategorySectionProps) {
  const { t } = useTranslation("settings")
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const categoryName = category?.display_name || t("tools.uncategorized", "Uncategorized")
  const categoryDescription = category?.description || ""

  const allSelected = tools.length > 0 && tools.every((tool) =>
    selectedTools.some((st) => st.id === tool.id)
  )
  const someSelected = tools.some((tool) =>
    selectedTools.some((st) => st.id === tool.id)
  ) && !allSelected

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
                <Badge variant="secondary">{tools.length}</Badge>
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
            {tools.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {t("tools.no_tools_in_category", "No tools in this category")}
              </div>
            ) : (
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={someSelected ? "indeterminate" : allSelected}
                          onCheckedChange={(checked) =>
                            onToggleAll(tools, !!checked)
                          }
                          aria-label="Select all"
                        />
                      </div>
                    </TableHead>
                    <TableHead className="w-[200px]">{t("tools.display_name", "Display Name")}</TableHead>
                    <TableHead className="w-[180px]">{t("tools.name", "Name")}</TableHead>
                    <TableHead className="w-[300px]">{t("tools.description_field", "Description")}</TableHead>
                    <TableHead className="w-[120px]">{t("tools.type", "Type")}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tools.map((tool) => {
                    const isSelected = selectedTools.some((st) => st.id === tool.id)
                    return (
                      <TableRow key={tool.id}>
                        <TableCell className="w-12">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                onToggleTool(tool, !!checked)
                              }
                              aria-label="Select row"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="w-[200px]">{tool.display_name}</TableCell>
                        <TableCell className="w-[180px]">
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {tool.name}
                          </code>
                        </TableCell>
                        <TableCell className="w-[300px]">
                          <div className="max-w-xs truncate" title={tool.description}>
                            {tool.description}
                          </div>
                        </TableCell>
                        <TableCell className="w-[120px]">
                          <Badge variant="outline">
                            {t(`tools.types.${tool.type}`, tool.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-12">
                          <ToolRowActions row={{ original: tool } as any} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
