import { Settings as SettingsIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import PageHeader from "@/components/ui/page-header"
import { useToast } from "@/components/ui/use-toast"
import { http } from "@/services"

interface IProvider {
  id: number
  name: string
  type: string
  base_url: string
}

interface IEmbeddingModel {
  name: string
  vector_size: number
}

interface IEmbeddingConfig {
  provider: IProvider | null
  model: string
  vector_size: string
}

export default function EmbeddingSettingsPage() {
  const { toast } = useToast()
  const { t } = useTranslation("settings")

  const [providers, setProviders] = useState<IProvider[]>([])
  const [selectedProviderId, setSelectedProviderId] = useState<string>("")
  const [models, setModels] = useState<IEmbeddingModel[]>([])
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [vectorSize, setVectorSize] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [currentConfig, setCurrentConfig] = useState<IEmbeddingConfig | null>(null)

  // Fetch all providers
  useEffect(() => {
    fetchProviders()
    fetchCurrentConfig()
  }, [])

  const fetchProviders = async () => {
    try {
      const response = await http.get("/providers")
      // Filter only Ollama providers
      const ollamaProviders = response.data?.records?.filter(
        (p: IProvider) => p.type?.toLowerCase() === "ollama"
      ) || []
      setProviders(ollamaProviders)
    } catch (error) {
      console.error("Failed to fetch providers:", error)
    }
  }

  const fetchCurrentConfig = async () => {
    try {
      const response = await http.get("/settings/embedding")
      setCurrentConfig(response.data)
      
      if (response.data.provider) {
        setSelectedProviderId(response.data.provider.id.toString())
        // Fetch models for this provider
        fetchModels(response.data.provider.id.toString())
      }
      if (response.data.model) {
        setSelectedModel(response.data.model)
      }
      if (response.data.vector_size) {
        setVectorSize(response.data.vector_size)
      }
    } catch (error) {
      console.error("Failed to fetch current config:", error)
    }
  }

  const fetchModels = async (providerId: string) => {
    if (!providerId) return

    setLoadingModels(true)
    try {
      const response = await http.get(`/settings/embedding/models/${providerId}`)
      setModels(response.data.models || [])
    } catch (error) {
      console.error("Failed to fetch models:", error)
      toast({
        title: t("error"),
        description: t("embedding.fetch_models_error"),
        variant: "destructive",
      })
    } finally {
      setLoadingModels(false)
    }
  }

  const handleProviderChange = (providerId: string) => {
    setSelectedProviderId(providerId)
    setSelectedModel("")
    setVectorSize("")
    setModels([])
    fetchModels(providerId)
  }

  const handleModelChange = (modelName: string) => {
    setSelectedModel(modelName)
    // Auto-set vector size based on model
    const model = models.find((m) => m.name === modelName)
    if (model) {
      setVectorSize(model.vector_size.toString())
    }
  }

  const handleSave = async () => {
    if (!selectedProviderId || !selectedModel || !vectorSize) {
      toast({
        title: t("error"),
        description: t("embedding.validation_error"),
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await http.put("/settings/embedding", {
        provider_id: parseInt(selectedProviderId),
        model: selectedModel,
        vector_size: parseInt(vectorSize),
      })

      toast({
        title: t("success"),
        description: t("embedding.save_success"),
      })
      fetchCurrentConfig()
    } catch (error: any) {
      console.error("Failed to save configuration:", error)
      toast({
        title: t("error"),
        description: error.response?.data?.message || t("embedding.save_error"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageHeader
        title={t("embedding.title")}
        description={t("embedding.description")}
      />

      <div className="h-full flex-1 flex-col space-y-6 p-8 pt-2 md:flex">
        {/* Current Configuration */}
        {currentConfig && currentConfig.provider && (
          <Card>
            <CardHeader>
              <CardTitle>{t("embedding.current_config")}</CardTitle>
              <CardDescription>
                {t("embedding.current_config_description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("embedding.provider")}:</span>
                <Badge variant="outline">{currentConfig.provider.name}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("embedding.model")}:</span>
                <Badge variant="secondary">{currentConfig.model || "-"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("embedding.vector_size")}:</span>
                <Badge>{currentConfig.vector_size || "-"}</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle>{t("embedding.configure_title")}</CardTitle>
            <CardDescription>
              {t("embedding.configure_description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label htmlFor="provider">{t("embedding.provider")}</Label>
              <Select
                value={selectedProviderId}
                onValueChange={handleProviderChange}
              >
                <SelectTrigger id="provider">
                  <SelectValue placeholder={t("embedding.select_provider")} />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id.toString()}>
                      {provider.name} ({provider.base_url})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("embedding.provider_help")}
              </p>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="model">{t("embedding.model")}</Label>
              <Select
                value={selectedModel}
                onValueChange={handleModelChange}
                disabled={!selectedProviderId || loadingModels}
              >
                <SelectTrigger id="model">
                  <SelectValue 
                    placeholder={
                      loadingModels 
                        ? t("embedding.loading_models") 
                        : t("embedding.select_model")
                    } 
                  />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.name} value={model.name}>
                      {model.name} (dim: {model.vector_size})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("embedding.model_help")}
              </p>
            </div>

            {/* Vector Size */}
            <div className="space-y-2">
              <Label htmlFor="vector_size">{t("embedding.vector_size")}</Label>
              <Input
                id="vector_size"
                type="number"
                value={vectorSize}
                onChange={(e) => setVectorSize(e.target.value)}
                placeholder="768"
                disabled={!selectedModel}
              />
              <p className="text-xs text-muted-foreground">
                {t("embedding.vector_size_help")}
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleSave} 
              disabled={loading || !selectedProviderId || !selectedModel || !vectorSize}
              className="w-full"
            >
              {loading ? t("embedding.saving") : t("embedding.save")}
            </Button>
          </CardFooter>
        </Card>

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("embedding.info_title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{t("embedding.info_1")}</p>
            <p>{t("embedding.info_2")}</p>
            <p>{t("embedding.info_3")}</p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
