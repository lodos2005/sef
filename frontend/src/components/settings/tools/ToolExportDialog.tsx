import { Download } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { http } from "@/services"
import { toast } from "sonner"

interface ToolExportDialogProps {
  selectedToolIds: number[]
  children?: React.ReactNode
}

export default function ToolExportDialog({
  selectedToolIds,
  children,
}: ToolExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<"json" | "yaml">("json")
  const [isExporting, setIsExporting] = useState(false)
  const { t } = useTranslation("settings")

  const handleExport = async () => {
    if (selectedToolIds.length === 0) {
      toast.error(t("tools.export.no_selection", "Please select at least one tool to export"))
      return
    }

    setIsExporting(true)
    try {
      const response = await http.post(
        "/tools/export",
        {
          tool_ids: selectedToolIds,
          format: format,
        },
        {
          responseType: "blob",
        }
      )

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute(
        "download",
        format === "yaml" ? "tools_export.yaml" : "tools_export.json"
      )
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success(
        t(
          "tools.export.success",
          `Successfully exported ${selectedToolIds.length} tool(s)`
        )
      )
      setOpen(false)
    } catch (error: any) {
      console.error("Export failed:", error)
      toast.error(
        error?.response?.data?.error ||
          t("tools.export.error", "Failed to export tools")
      )
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            disabled={selectedToolIds.length === 0}
          >
            <Download className="mr-2 size-4" />
            {t("tools.export.button", "Export")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("tools.export.title", "Export Tools")}</DialogTitle>
          <DialogDescription>
            {t(
              "tools.export.description",
              `Export ${selectedToolIds.length} selected tool(s) to a file`
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-3">
            <Label>{t("tools.export.format", "Export Format")}</Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as "json" | "yaml")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="font-normal cursor-pointer">
                  JSON
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yaml" id="yaml" />
                <Label htmlFor="yaml" className="font-normal cursor-pointer">
                  YAML
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("tools.export.cancel", "Cancel")}
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting
              ? t("tools.export.exporting", "Exporting...")
              : t("tools.export.confirm", "Export")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
