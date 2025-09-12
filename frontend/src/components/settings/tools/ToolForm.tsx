import { Save } from "lucide-react"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { KeyValueInput } from "@/components/ui/key-value-input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useEmitter } from "@/hooks/useEmitter"
import { http } from "@/services"
import { ITool } from "@/types/tool"

interface ToolFormProps {
    mode: 'create' | 'edit'
    tool?: ITool | null
    onSuccess?: () => void
}

export default function ToolForm({ mode, tool, onSuccess }: ToolFormProps) {
    const router = useRouter()
    const { t } = useTranslation("settings")
    const emitter = useEmitter()

    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingData, setIsLoadingData] = useState(mode === 'edit')
    const [schema, setSchema] = useState<Record<string, any> | null>(null)
    const [formData, setFormData] = useState({
        name: tool?.name || "",
        display_name: tool?.display_name || "",
        description: tool?.description || "",
        type: tool?.type || "api",
        config: tool?.config || {} as Record<string, any>,
    })

    // Load tool data for edit mode
    useEffect(() => {
        if (mode === 'edit' && !tool) {
            const { id } = router.query
            if (!id) return

            const loadTool = async () => {
                try {
                    const response = await http.get(`/tools/${id}`)
                    const toolData = response.data
                    setFormData({
                        name: toolData.name,
                        display_name: toolData.display_name,
                        description: toolData.description,
                        type: toolData.type,
                        config: toolData.config || {},
                    })
                } catch (error) {
                    console.error("Failed to load tool:", error)
                    router.push("/settings/tools")
                } finally {
                    setIsLoadingData(false)
                }
            }

            loadTool()
        } else if (mode === 'edit' && tool) {
            setIsLoadingData(false)
        }
    }, [mode, tool, router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            if (mode === 'create') {
                await http.post("/tools", formData)
            } else if (mode === 'edit' && tool) {
                await http.patch(`/tools/${tool.id}`, formData)
            }

            emitter.emit("REFETCH_TOOLS")
            if (onSuccess) {
                onSuccess()
            } else {
                router.push("/settings/tools")
            }
        } catch (error) {
            console.error(`Failed to ${mode} tool:`, error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
    }

    // Fetch schema when tool type changes
    useEffect(() => {
        const fetchSchema = async () => {
            try {
                const response = await http.get(`/tools/schema?type=${formData.type}`)
                setSchema(response.data.schema)
            } catch (error) {
                console.error("Failed to fetch schema:", error)
                setSchema(null)
            }
        }

        if (formData.type) {
            fetchSchema()
        }
    }, [formData.type])

    const renderFormField = (key: string, fieldSchema: any) => {
        const value = formData.config[key] || ""
        const description = fieldSchema.description || ""
        const required = schema?.required?.includes(key) || false

        // Try to get translated label, fallback to key
        const label = t(`tools.fields.${key}`, key)

        switch (fieldSchema.type) {
            case "string":
                if (fieldSchema.enum) {
                    return (
                        <div key={key} className="space-y-3">
                            <Label htmlFor={key} className="text-sm font-medium flex items-center gap-2">
                                {label} {required && <span className="text-red-500">*</span>}
                            </Label>
                            {description && <p className="text-xs text-muted-foreground">{description}</p>}
                            <Select
                                value={value}
                                onValueChange={(value) => handleConfigChange(key, value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t("tools.select_placeholder", "Select {{field}}", { field: label })} />
                                </SelectTrigger>
                                <SelectContent>
                                    {fieldSchema.enum.map((option: string) => (
                                        <SelectItem key={option} value={option}>
                                            {t(`tools.options.${option}`, option)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )
                }

                // Special handling for body field - use textarea
                if (key === "body") {
                    return (
                        <div key={key} className="space-y-3">
                            <Label htmlFor={key} className="text-sm font-medium flex items-center gap-2">
                                {label} {required && <span className="text-red-500">*</span>}
                            </Label>
                            {description && <p className="text-xs text-muted-foreground">{description}</p>}
                            <Textarea
                                id={key}
                                value={value}
                                onChange={(e) => handleConfigChange(key, e.target.value)}
                                rows={8}
                                placeholder={t("tools.body_placeholder", "Enter request body (JSON)")}
                                className="font-mono text-sm min-h-[120px] resize-y"
                            />
                        </div>
                    )
                }

                return (
                    <div key={key} className="space-y-3">
                        <Label htmlFor={key} className="text-sm font-medium flex items-center gap-2">
                            {label} {required && <span className="text-red-500">*</span>}
                        </Label>
                        {description && <p className="text-xs text-muted-foreground">{description}</p>}
                        <Input
                            id={key}
                            type="text"
                            value={value}
                            onChange={(e) => handleConfigChange(key, e.target.value)}
                            placeholder={t("tools.enter_placeholder", "Enter {{field}}", { field: label })}
                            required={required}

                        />
                    </div>
                )

            case "integer":
            case "number":
                return (
                    <div key={key} className="space-y-3">
                        <Label htmlFor={key} className="text-sm font-medium flex items-center gap-2">
                            {label} {required && <span className="text-red-500">*</span>}
                        </Label>
                        {description && <p className="text-xs text-muted-foreground">{description}</p>}
                        <Input
                            id={key}
                            type="number"
                            step={fieldSchema.type === "integer" ? "1" : "any"}
                            value={value}
                            onChange={(e) => handleConfigChange(key, parseFloat(e.target.value) || 0)}
                            placeholder={t("tools.enter_placeholder", "Enter {{field}}", { field: label.toLowerCase() })}
                            required={required}
                        />
                    </div>
                )

            case "boolean":
                return (
                    <div key={key} className="flex items-center justify-between p-4 border rounded-lg bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="space-y-1">
                            <Label htmlFor={key} className="text-sm font-medium flex items-center gap-2">
                                {label} {required && <span className="text-red-500">*</span>}
                            </Label>
                            {description && <p className="text-xs text-muted-foreground">{description}</p>}
                        </div>
                        <input
                            id={key}
                            type="checkbox"
                            checked={value || false}
                            onChange={(e) => handleConfigChange(key, e.target.checked)}
                            className="rounded border-2 border-slate-300 dark:border-slate-600 w-5 h-5 text-blue-600 focus:ring-blue-500"
                        />
                    </div>
                )

            case "object":
                if (key === "headers") {
                    return (
                        <div key={key} className="space-y-3">
                            <Label htmlFor={key} className="text-sm font-medium flex items-center gap-2">
                                {t("tools.fields.headers", "Headers")} {required && <span className="text-red-500">*</span>}
                            </Label>
                            {description && <p className="text-xs text-muted-foreground">{description}</p>}
                            <div className="border rounded-lg p-4 bg-slate-50/50 dark:bg-slate-800/50">
                                <KeyValueInput
                                    value={value || {}}
                                    onChange={(newValue) => handleConfigChange(key, newValue)}
                                    placeholder={{
                                        key: t("tools.header_name", "Header Name"),
                                        value: t("tools.header_value", "Header Value")
                                    }}
                                />
                            </div>
                        </div>
                    )
                }
                return (
                    <div key={key} className="space-y-3">
                        <Label htmlFor={key} className="text-sm font-medium flex items-center gap-2">
                            {label} {required && <span className="text-red-500">*</span>}
                        </Label>
                        {description && <p className="text-xs text-muted-foreground">{description}</p>}
                        <Textarea
                            id={key}
                            value={typeof value === "object" ? JSON.stringify(value, null, 2) : value}
                            onChange={(e) => {
                                try {
                                    const parsed = JSON.parse(e.target.value)
                                    handleConfigChange(key, parsed)
                                } catch (error) {
                                    handleConfigChange(key, e.target.value)
                                }
                            }}
                            rows={6}
                            className="font-mono text-sm min-h-[120px] resize-y"
                            placeholder={t("tools.json_placeholder", '{"key": "value"}')}
                        />
                    </div>
                )

            default:
                return (
                    <div key={key} className="space-y-3">
                        <Label htmlFor={key} className="text-sm font-medium flex items-center gap-2">
                            {label} {required && <span className="text-red-500">*</span>}
                        </Label>
                        {description && <p className="text-xs text-muted-foreground">{description}</p>}
                        <Input
                            id={key}
                            type="text"
                            value={value}
                            onChange={(e) => handleConfigChange(key, e.target.value)}
                            placeholder={t("tools.enter_placeholder", "Enter {{field}}", { field: label.toLowerCase() })}
                            required={required}

                        />
                    </div>
                )
        }
    }

    const handleConfigChange = (key: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            config: {
                ...prev.config,
                [key]: value
            }
        }))
    }

    if (isLoadingData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-6"></div>
                    <p className="text-xl text-muted-foreground">{t("tools.loading", "Loading tool...")}</p>
                </div>
            </div>
        )
    }

    if (mode === 'edit' && !tool) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <div className="w-8 h-8 bg-red-500 rounded-full"></div>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{t("tools.not_found", "Tool not found")}</h2>
                    <p className="text-muted-foreground mb-6">The tool you're looking for doesn't exist or has been deleted.</p>
                    <Button
                        variant="outline"
                        onClick={() => router.push("/settings/tools")}
                        className="px-6"
                    >
                        {t("tools.back_to_tools", "Back to Tools")}
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            <div className="mx-auto py-8 px-8">
                <div className="mb-8">
                    <div>
                        <h1 className="text-2xl font-bold">
                            {mode === 'create' ? t("tools.create_title", "Create New Tool") : t("tools.edit_title", "Edit Tool")}
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            {mode === 'create'
                                ? t("tools.create_description", "Create a new tool for your AI assistants.")
                                : t("tools.edit_description", "Update the tool configuration.")
                            }
                        </p>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Basic Information Card */}
                    <Card>
                        <div className="p-6">
                            <h3 className="text-xl font-semibold">
                                {t("tools.basic_info", "Basic Information")}
                            </h3>
                            <p className="text-muted-foreground">
                                {t("tools.basic_info_description", "Provide basic information about your tool.")}
                            </p>
                        </div>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Name and Display Name */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-3">
                                        <Label htmlFor="name" className="text-sm font-medium">
                                            {t("tools.name", "Name")} <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange("name", e.target.value)}
                                            placeholder={t("tools.name_placeholder", "api_tool")}
                                            required

                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {t("tools.name_help", "Internal identifier (lowercase, underscores only)")}
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <Label htmlFor="display_name" className="text-sm font-medium">
                                            {t("tools.display_name", "Display Name")} <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="display_name"
                                            type="text"
                                            value={formData.display_name}
                                            onChange={(e) => handleInputChange("display_name", e.target.value)}
                                            placeholder={t("tools.display_name_placeholder", "My API Tool")}
                                            required

                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {t("tools.display_name_help", "Human-readable name shown in the interface")}
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <Label htmlFor="type" className="text-sm font-medium">
                                            {t("tools.type", "Type")}
                                        </Label>
                                        <Select
                                            value={formData.type}
                                            onValueChange={(value) => handleInputChange("type", value)}
                                        >
                                            <SelectTrigger >
                                                <SelectValue placeholder={t("tools.select_type", "Select tool type")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="api">{t("tools.types.api", "API")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="description" className="text-sm font-medium">
                                        {t("tools.description_field", "Description")} <span className="text-red-500">*</span>
                                    </Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => handleInputChange("description", e.target.value)}
                                        rows={4}
                                        placeholder={t("tools.description_placeholder", "Describe what this tool does...")}
                                        required
                                        className="min-h-[100px] resize-none"
                                    />
                                </div>

                                {/* Configuration Section */}
                                {schema?.properties && (
                                    <div className="pt-8">
                                        <div className="mb-6">
                                            <h3 className="text-xl font-semibold">
                                                {t("tools.configuration", "Configuration")}
                                            </h3>
                                            <p className="text-muted-foreground">
                                                {t("tools.configuration_description", "Configure the parameters for your tool.")}
                                            </p>
                                        </div>

                                        <div className="space-y-6">
                                            {/* Define the correct order based on the Go schema */}
                                            {[
                                                ['url', schema.properties.url],
                                                ['method', schema.properties.method],
                                                ['headers', schema.properties.headers],
                                                ['body', schema.properties.body],
                                                ['timeout', schema.properties.timeout],
                                            ].map(([key, fieldSchema]) => {
                                                if (!fieldSchema) return null

                                                return (
                                                    <div key={key} className="space-y-3">
                                                        {renderFormField(key as string, fieldSchema)}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex justify-end gap-4 pt-8 ">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => router.push("/settings/tools")}
                                        disabled={isLoading}
                                    >
                                        {t("tools.cancel", "Cancel")}
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                    >
                                        <Save className="mr-2 h-4 w-4" />
                                        {isLoading
                                            ? (mode === 'create' ? t("tools.creating", "Creating...") : t("tools.updating", "Updating..."))
                                            : (mode === 'create' ? t("tools.create", "Create") : t("tools.update", "Update"))
                                        }
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
