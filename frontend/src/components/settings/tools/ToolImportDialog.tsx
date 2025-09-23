import { Upload, FileText, AlertCircle, CheckCircle, X } from "lucide-react"
import { useState, useRef } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { useEmitter } from "@/hooks/useEmitter"
import { http } from "@/services"

interface ImportResult {
  success: boolean
  imported_count: number
  total_count: number
  tools: any[]
  errors: string[]
}

interface ToolImportDialogProps {
  children: React.ReactNode
}

export default function ToolImportDialog({ children }: ToolImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [updateExisting, setUpdateExisting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const emitter = useEmitter()
  const { t } = useTranslation("settings")

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const supportedFile = files.find(file => {
      const name = file.name.toLowerCase()
      return name.endsWith('.json') || name.endsWith('.yaml') || name.endsWith('.yml')
    })
    
    if (supportedFile) {
      setSelectedFile(supportedFile)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) return

    setIsImporting(true)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const url = updateExisting ? '/tools/import?update_existing=true' : '/tools/import'
      const response = await http.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setImportResult(response.data)
      
      if (response.data.success && response.data.imported_count > 0) {
        emitter.emit("REFETCH_TOOLS")
      }
    } catch (error: any) {
      console.error('Import failed:', error)
      setImportResult({
        success: false,
        imported_count: 0,
        total_count: 0,
        tools: [],
        errors: [error.response?.data?.error || 'Import failed'],
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setSelectedFile(null)
    setImportResult(null)
    setUpdateExisting(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getFileIcon = (filename: string) => {
    if (filename.toLowerCase().includes('postman')) {
      return <FileText className="h-8 w-8 text-orange-500" />
    }
    return <FileText className="h-8 w-8 text-blue-500" />
  }

  const getFileDescription = (filename: string) => {
    const name = filename.toLowerCase()
    if (name.includes('postman')) {
      return 'Postman Collection'
    }
    if (name.includes('openapi') || name.includes('swagger')) {
      return 'OpenAPI/Swagger Specification'
    }
    if (name.endsWith('.yaml') || name.endsWith('.yml')) {
      return 'YAML File'
    }
    return 'JSON File'
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t("tools.import.title", "Import Tools")}
          </DialogTitle>
          <DialogDescription>
            {t("tools.import.description", "Import API tools from Postman collections or OpenAPI/Swagger specifications.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Area */}
          {!selectedFile && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium mb-2">
                {t("tools.import.drag_drop", "Drag and drop your JSON file here")}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {t("tools.import.supported_formats", "Supports Postman collections and OpenAPI/Swagger specifications in JSON or YAML format")}
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                {t("tools.import.browse", "Browse Files")}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.yaml,.yml"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Selected File */}
          {selectedFile && !importResult && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                {getFileIcon(selectedFile.name)}
                <div className="flex-1">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {getFileDescription(selectedFile.name)} • {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="update-existing"
                  checked={updateExisting}
                  onCheckedChange={(checked) => setUpdateExisting(checked === true)}
                />
                <Label htmlFor="update-existing" className="text-sm">
                  {t("tools.import.update_existing", "Update existing tools with same names")}
                </Label>
              </div>
            </div>
          )}

          {/* Import Progress */}
          {isImporting && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm">
                  {t("tools.import.processing", "Processing import...")}
                </span>
              </div>
              <Progress value={undefined} className="w-full" />
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="space-y-4">
              {importResult.success ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t(
                      "tools.import.success",
                      "Successfully imported {{count}} tools",
                      { count: importResult.imported_count }
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t("tools.import.failed", "Import failed")}
                  </AlertDescription>
                </Alert>
              )}

              {importResult.errors && importResult.errors.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">
                    {t("tools.import.errors", "Import Errors")}:
                  </h4>
                  <div className="bg-red-50 border border-red-200 rounded p-3 max-h-32 overflow-y-auto">
                    {importResult.errors.map((error, index) => (
                      <p key={index} className="text-sm text-red-600 mb-1">
                        • {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {importResult.imported_count > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">
                    {t("tools.import.imported_tools", "Imported Tools")}:
                  </h4>
                  <div className="bg-green-50 border border-green-200 rounded p-3 max-h-32 overflow-y-auto">
                    {importResult.tools.map((tool, index) => (
                      <p key={index} className="text-sm text-green-700 mb-1">
                        • {tool.display_name} ({tool.name})
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {importResult ? t("tools.import.close", "Close") : t("tools.import.cancel", "Cancel")}
          </Button>
          {!importResult && selectedFile && (
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting
                ? t("tools.import.importing", "Importing...")
                : t("tools.import.import", "Import Tools")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}