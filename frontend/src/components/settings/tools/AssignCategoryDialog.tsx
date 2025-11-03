import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { IToolCategory } from "@/types/tool-category"
import { http } from "@/services"

interface AssignCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedToolIds: number[]
  categories: IToolCategory[]
  onSuccess?: () => void
}

export function AssignCategoryDialog({
  open,
  onOpenChange,
  selectedToolIds,
  categories,
  onSuccess,
}: AssignCategoryDialogProps) {
  const { t } = useTranslation("settings")
  const [loading, setLoading] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("none")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Use bulk update endpoint - single request for all tools
      const categoryId = selectedCategoryId === "none" ? null : parseInt(selectedCategoryId)

      await http.post("/tools/bulk-update-category", {
        tool_ids: selectedToolIds,
        category_id: categoryId,
      })

      toast.success(
        t(
          "tools.category_assigned",
          "{{count}} tool(s) moved to category successfully",
          { count: selectedToolIds.length }
        )
      )
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(
        error.response?.data?.error ||
          t("tools.category_assign_error", "Failed to assign category")
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("tools.assign_category", "Assign Category")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "tools.assign_category_description",
              "Move {{count}} selected tool(s) to a category",
              { count: selectedToolIds.length }
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category">
                {t("tools.select_category", "Select Category")}
              </Label>
              <Select
                value={selectedCategoryId}
                onValueChange={setSelectedCategoryId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t(
                      "tools.select_category_placeholder",
                      "Choose a category"
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    {t("tools.no_category", "No category")}
                  </SelectItem>
                  {categories
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((category) => (
                      <SelectItem
                        key={category.id}
                        value={category.id.toString()}
                      >
                        {category.display_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? t("common.moving", "Moving...")
                : t("tools.move_to_category", "Move to Category")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
