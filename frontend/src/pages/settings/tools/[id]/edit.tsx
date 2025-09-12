import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import { useTranslation } from "react-i18next"
import ToolForm from "@/components/settings/tools/ToolForm"
import { Button } from "@/components/ui/button"
import { http } from "@/services"
import { ITool } from "@/types/tool"

export default function EditTool() {
  const router = useRouter()
  const { id } = router.query
  const { t } = useTranslation("settings")

  const [tool, setTool] = useState<ITool | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)

  // Load tool data
  useEffect(() => {
    const loadTool = async () => {
      if (!id) return

      try {
        const response = await http.get(`/tools/${id}`)
        const toolData = response.data
        setTool(toolData)
      } catch (error) {
        console.error("Failed to load tool:", error)
        router.push("/settings/tools")
      } finally {
        setIsLoadingData(false)
      }
    }

    loadTool()
  }, [id, router])

  if (isLoadingData) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t("tools.loading", "Loading tool...")}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!tool) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="text-center">
          <p className="text-muted-foreground">{t("tools.not_found", "Tool not found")}</p>
          <Button
            variant="outline"
            onClick={() => router.push("/settings/tools")}
            className="mt-4"
          >
            {t("tools.back_to_tools", "Back to Tools")}
          </Button>
        </div>
      </div>
    )
  }

  return <ToolForm mode="edit" tool={tool} />
}
