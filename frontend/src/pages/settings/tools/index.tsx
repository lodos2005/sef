import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"
import { PlusCircleIcon, Upload, FolderKanban, FolderInput, Search } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  const [allTools, setAllTools] = useState<ITool[]>([])
  const [loading, setLoading] = useState(true)
  const [assignCategoryDialogOpen, setAssignCategoryDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const emitter = useEmitter()
  const { t } = useTranslation("settings")

  const fetchData = async () => {
    try {
      setLoading(true)
      // Fetch categories with tools
      const categoriesResponse = await toolCategoriesService.getToolCategories({
        per_page: 1000,
      })
      setCategories(categoriesResponse.records || [])

      // Fetch all tools
      const toolsResponse = await http.get("/tools", {
        params: { per_page: 1000 },
      })
      setAllTools(toolsResponse.data.records || [])
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
    })
    return () => emitter.off("REFETCH_TOOLS")
  }, [])

  const handleAssignCategorySuccess = () => {
    setSelectedTools([])
    fetchData()
  }

  // Filter tools based on search query
  const filteredTools = allTools.filter((tool) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      tool.name.toLowerCase().includes(query) ||
      tool.display_name.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query) ||
      tool.type.toLowerCase().includes(query)
    )
  })

  // Group tools by category
  const groupedTools: Record<string, ITool[]> = {}
  const uncategorizedTools: ITool[] = []

  filteredTools.forEach((tool) => {
    if (tool.category_id) {
      const categoryId = tool.category_id.toString()
      if (!groupedTools[categoryId]) {
        groupedTools[categoryId] = []
      }
      groupedTools[categoryId].push(tool)
    } else {
      uncategorizedTools.push(tool)
    }
  })

  const handleToggleAll = (tools: ITool[], checked: boolean) => {
    if (checked) {
      const newSelected = [...selectedTools]
      tools.forEach((tool) => {
        if (!newSelected.some((t) => t.id === tool.id)) {
          newSelected.push(tool)
        }
      })
      setSelectedTools(newSelected)
    } else {
      setSelectedTools(
        selectedTools.filter(
          (t) => !tools.some((tool) => tool.id === t.id)
        )
      )
    }
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
          <div className="flex flex-col gap-4">
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

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("tools.search_placeholder", "Search tools by name, type, or description...")}
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
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
                    tools={groupedTools[category.id.toString()] || []}
                    selectedTools={selectedTools}
                    onToggleAll={handleToggleAll}
                    onToggleTool={handleToggleTool}
                  />
                ))}

              {/* Render uncategorized tools */}
              {uncategorizedTools.length > 0 && (
                <CategorySection
                  category={null}
                  tools={uncategorizedTools}
                  selectedTools={selectedTools}
                  onToggleAll={handleToggleAll}
                  onToggleTool={handleToggleTool}
                />
              )}

              {allTools.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {t("tools.empty", "No tools found")}
                </div>
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
