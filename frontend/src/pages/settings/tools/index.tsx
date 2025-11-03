import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"
import { PlusCircleIcon, Upload, FolderKanban, FolderInput } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PageHeader from "@/components/ui/page-header"
import { useEmitter } from "@/hooks/useEmitter"
import { ITool } from "@/types/tool"
import { IToolCategory } from "@/types/tool-category"
import ToolImportDialog from "@/components/settings/tools/ToolImportDialog"
import ToolExportDialog from "@/components/settings/tools/ToolExportDialog"
import { CategorySection } from "@/components/settings/tools/CategorySection"
import { CategoryManagement } from "@/components/settings/tools/CategoryManagement"
import { AssignCategoryDialog } from "@/components/settings/tools/AssignCategoryDialog"
import { toolCategoriesService } from "@/services/tool-categories.service"
import { toast } from "sonner"
import { http } from "@/services"

export default function ToolSettingsPage() {
  const [selectedTools, setSelectedTools] = useState<ITool[]>([])
  const [categories, setCategories] = useState<IToolCategory[]>([])
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [assignCategoryDialogOpen, setAssignCategoryDialogOpen] = useState(false)
  const [refetchTrigger, setRefetchTrigger] = useState(0)
  const emitter = useEmitter()
  const { t } = useTranslation("settings")

  const fetchData = async () => {
    try {
      setLoading(true)
      // Fetch categories
      const categoriesResponse = await toolCategoriesService.getToolCategories({
        per_page: 1000,
      })
      setCategories(categoriesResponse.records || [])

      // Fetch tool counts for each category
      const counts: Record<string, number> = {}

      // Get counts for each category using filter parameter
      for (const category of categoriesResponse.records || []) {
        const filter = JSON.stringify([{ id: "category_id", value: category.id.toString() }])
        const response = await http.get("/tools", {
          params: { filter, per_page: 1 },
        })
        counts[category.id.toString()] = response.data.total_records || 0
      }

      // Get count for uncategorized tools using filter parameter with "null" value
      const uncategorizedFilter = JSON.stringify([{ id: "category_id", value: "null" }])
      const uncategorizedResponse = await http.get("/tools", {
        params: { filter: uncategorizedFilter, per_page: 1 },
      })
      counts["null"] = uncategorizedResponse.data.total_records || 0

      setCategoryCounts(counts)
    } catch (error: any) {
      toast.error(
        error.response?.data?.error ||
          t("tools.fetch_error", "Failed to fetch tools")
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    emitter.on("REFETCH_TOOLS", () => {
      fetchData()
      setRefetchTrigger((prev) => prev + 1)
    })
    return () => emitter.off("REFETCH_TOOLS")
  }, [])

  const handleAssignCategorySuccess = () => {
    setSelectedTools([])
    fetchData()
    setRefetchTrigger((prev) => prev + 1)
  }

  const handleToggleAll = (tools: ITool[], checked: boolean) => {
    setSelectedTools(tools)
  }

  const handleToggleTool = (tool: ITool, checked: boolean) => {
    if (checked) {
      setSelectedTools([...selectedTools, tool])
    } else {
      setSelectedTools(selectedTools.filter((t) => t.id !== tool.id))
    }
  }

  return (
    <>
      <PageHeader
        title={t("tools.title", "Tools")}
        description={t("tools.description", "Manage your AI tools and their configurations")}
      />

      <Tabs defaultValue="tools" className="space-y-4 ml-7 mr-7">
        <TabsList>
          <TabsTrigger value="tools">
            {t("tools.tab", "Tools")}
          </TabsTrigger>
          <TabsTrigger value="categories">
            <FolderKanban className="mr-2 size-4" />
            {t("tools.categories.tab", "Categories")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tools" className="space-y-4">
          <div className="flex gap-2 items-center justify-between">
            <div className="flex gap-2">
              <Link href="/settings/tools/create">
                <Button variant="outline" size="sm" className="h-8 lg:flex">
                  <PlusCircleIcon className="mr-2 size-4" />
                  {t("tools.create.button", "Create Tool")}
                </Button>
              </Link>
              <ToolImportDialog>
                <Button variant="outline" size="sm" className="h-8 lg:flex">
                  <Upload className="mr-2 size-4" />
                  {t("tools.import.button", "Import")}
                </Button>
              </ToolImportDialog>
              <ToolExportDialog selectedToolIds={selectedTools.map((tool: ITool) => tool.id)} />
            </div>

            {selectedTools.length > 0 && (
              <div className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground">
                  {t("tools.selected_count", "{{count}} selected", {
                    count: selectedTools.length,
                  })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setAssignCategoryDialogOpen(true)}
                >
                  <FolderInput className="mr-2 size-4" />
                  {t("tools.move_to_category", "Move to Category")}
                </Button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8">
              {t("common.loading", "Loading...")}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Render categorized tools */}
              {categories
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((category) => (
                  <CategorySection
                    key={category.id}
                    category={category}
                    totalCount={categoryCounts[category.id.toString()] || 0}
                    selectedTools={selectedTools}
                    onToggleAll={handleToggleAll}
                    onToggleTool={handleToggleTool}
                    refetchTrigger={refetchTrigger}
                  />
                ))}

              {/* Render uncategorized tools */}
              {categoryCounts["null"] > 0 && (
                <CategorySection
                  category={null}
                  totalCount={categoryCounts["null"] || 0}
                  selectedTools={selectedTools}
                  onToggleAll={handleToggleAll}
                  onToggleTool={handleToggleTool}
                  refetchTrigger={refetchTrigger}
                />
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories">
          <CategoryManagement categories={categories} onUpdate={fetchData} />
        </TabsContent>
      </Tabs>

      <AssignCategoryDialog
        open={assignCategoryDialogOpen}
        onOpenChange={setAssignCategoryDialogOpen}
        selectedToolIds={selectedTools.map((tool: ITool) => tool.id)}
        categories={categories}
        onSuccess={handleAssignCategorySuccess}
      />
    </>
  )
}
