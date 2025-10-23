import { useState, useEffect } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { toolCategoriesService } from "@/services/tool-categories.service"
import { IToolCategory } from "@/types/tool-category"

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: IToolCategory
  onSuccess?: () => void
}

export function CategoryDialog({
  open,
  onOpenChange,
  category,
  onSuccess,
}: CategoryDialogProps) {
  const { t } = useTranslation("settings")
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    display_name: "",
    description: "",
    order: 0,
  })

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        display_name: category.display_name,
        description: category.description || "",
        order: category.order || 0,
      })
    } else {
      setFormData({
        name: "",
        display_name: "",
        description: "",
        order: 0,
      })
    }
  }, [category, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (category) {
        await toolCategoriesService.updateToolCategory(category.id, formData)
        toast.success(t("tools.category.updated", "Category updated successfully"))
      } else {
        await toolCategoriesService.createToolCategory(formData)
        toast.success(t("tools.category.created", "Category created successfully"))
      }
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(
        error.response?.data?.error ||
          t("tools.category.error", "Failed to save category")
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
            {category
              ? t("tools.category.edit", "Edit Category")
              : t("tools.category.create", "Create Category")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "tools.category.description",
              "Create a category to organize your tools"
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                {t("tools.category.name", "Name")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="api_tools"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="display_name">
                {t("tools.category.display_name", "Display Name")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) =>
                  setFormData({ ...formData, display_name: e.target.value })
                }
                placeholder="API Tools"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">
                {t("tools.category.description_field", "Description")}
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder={t(
                  "tools.category.description_placeholder",
                  "Category description"
                )}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="order">
                {t("tools.category.order", "Order")}
              </Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) =>
                  setFormData({ ...formData, order: parseInt(e.target.value) || 0 })
                }
                placeholder="0"
              />
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
                ? t("common.saving", "Saving...")
                : category
                  ? t("common.update", "Update")
                  : t("common.create", "Create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
