import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { PlusCircleIcon, Pencil, Trash2 } from "lucide-react"
import { CategoryDialog } from "./CategoryDialog"
import { IToolCategory } from "@/types/tool-category"
import { toolCategoriesService } from "@/services/tool-categories.service"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface CategoryManagementProps {
  categories: IToolCategory[]
  onUpdate: () => void
}

export function CategoryManagement({
  categories,
  onUpdate,
}: CategoryManagementProps) {
  const { t } = useTranslation("settings")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<
    IToolCategory | undefined
  >()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState<
    IToolCategory | undefined
  >()

  const handleEdit = (category: IToolCategory) => {
    setEditingCategory(category)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingCategory) return

    try {
      await toolCategoriesService.deleteToolCategory(deletingCategory.id)
      toast.success(
        t("tools.category.deleted", "Category deleted successfully")
      )
      onUpdate()
    } catch (error: any) {
      toast.error(
        error.response?.data?.error ||
          t("tools.category.delete_error", "Failed to delete category")
      )
    } finally {
      setDeleteDialogOpen(false)
      setDeletingCategory(undefined)
    }
  }

  const handleCreate = () => {
    setEditingCategory(undefined)
    setDialogOpen(true)
  }

  const handleSuccess = () => {
    onUpdate()
    setEditingCategory(undefined)
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {t("tools.categories.title", "Tool Categories")}
              </CardTitle>
              <CardDescription>
                {t(
                  "tools.categories.description",
                  "Organize your tools into categories"
                )}
              </CardDescription>
            </div>
            <Button onClick={handleCreate} size="sm">
              <PlusCircleIcon className="mr-2 size-4" />
              {t("tools.category.create", "Create Category")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("tools.categories.empty", "No categories created yet")}
              </p>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <div className="font-medium">{category.display_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {category.description || t("tools.category.no_description", "No description")}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t("tools.category.tools_count", "{{count}} tools", {
                        count: category.tools?.length || 0,
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(category)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeletingCategory(category)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editingCategory}
        onSuccess={handleSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("tools.category.delete_confirm", "Delete Category")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "tools.category.delete_confirm_message",
                "Are you sure you want to delete this category? This action cannot be undone."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common.cancel", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("common.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
