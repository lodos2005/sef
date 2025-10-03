import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { http } from "@/services"
import { Code, Play, RotateCcw, Sparkles } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { ITool } from "@/types/tool"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

interface TestResult {
  tool_call_details: {
    tool_type: string
    method?: string
    url?: string
    parameters: Record<string, any>
    executed_at: string
    tool_call_id?: string
    function_name?: string
    tool_name?: string
  }
  status_code?: number
  body: any
  result_count?: number
}

interface Provider {
  id: number
  name: string
  type: string
  description: string
  base_url: string
}

export default function TestTool() {
  const router = useRouter()
  const { id } = router.query
  const { t } = useTranslation("settings")

  const [tool, setTool] = useState<ITool | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testError, setTestError] = useState<string | null>(null)

  // JQ Testing state
  const [isTestingJq, setIsTestingJq] = useState(false)
  const [jqTestResult, setJqTestResult] = useState<any>(null)
  const [jqTestError, setJqTestError] = useState<string | null>(null)
  const [jqSampleData, setJqSampleData] = useState(
    '{}'
  )
  const [jqQuery, setJqQuery] = useState("")
  const [jqParameters, setJqParameters] = useState<Record<string, any>>({})
  const [jqParametersInput, setJqParametersInput] = useState('{}')

  // AI JQ Generation state
  const [providers, setProviders] = useState<Provider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>("")
  const [models, setModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [jqDescription, setJqDescription] = useState("")
  const [jqExistingQuery, setJqExistingQuery] = useState("")
  const [jqGenerationParameters, setJqGenerationParameters] = useState<Record<string, any>>({})
  const [jqGenerationParametersInput, setJqGenerationParametersInput] = useState('{}')
  const [isGeneratingJq, setIsGeneratingJq] = useState(false)
  const [generateJqError, setGenerateJqError] = useState<string | null>(null)

  const { register, handleSubmit, setValue, watch, reset } = useForm<{
    parameters: Record<string, any>
  }>({
    defaultValues: {
      parameters: {},
    },
  })

  const watchedParameters = watch("parameters")

  // Load tool data
  useEffect(() => {
    const loadTool = async () => {
      if (!id) return

      try {
        const response = await http.get(`/tools/${id}`)
        const toolData = response.data
        setTool(toolData)

        // Initialize parameters with defaults
        const defaultParams: Record<string, any> = {}
        if (toolData.parameters) {
          toolData.parameters.forEach((param: any) => {
            if (param.type === "boolean") {
              defaultParams[param.name] = false
            } else if (param.type === "number" || param.type === "integer") {
              defaultParams[param.name] = 0
            } else {
              defaultParams[param.name] = ""
            }
          })
        }
        setValue("parameters", defaultParams)

        // Initialize JQ query from tool config if available
        if (toolData.config?.jq_query) {
          setJqQuery(toolData.config.jq_query)
          setJqExistingQuery(toolData.config.jq_query)
        }
      } catch (error) {
        console.error("Failed to load tool:", error)
        router.push("/settings/tools")
      } finally {
        setIsLoadingData(false)
      }
    }

    loadTool()
  }, [id, router, setValue])

  // Load providers
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const response = await http.get("/providers")
        setProviders(response.data.records || [])
      } catch (error) {
        console.error("Failed to load providers:", error)
      }
    }

    loadProviders()
  }, [])

  // Load models when provider changes
  useEffect(() => {
    const loadModels = async () => {
      if (!selectedProvider) {
        setModels([])
        setSelectedModel("")
        return
      }

      try {
        const response = await http.get(`/providers/${selectedProvider}/models`)
        setModels(response.data.models || [])
        setSelectedModel("")
      } catch (error) {
        console.error("Failed to load models:", error)
        setModels([])
        setSelectedModel("")
      }
    }

    loadModels()
  }, [selectedProvider])

  const onSubmit = async (data: { parameters: Record<string, any> }) => {
    if (!tool) return

    setIsTesting(true)
    setTestResult(null)
    setTestError(null)

    try {
      const response = await http.post(`/tools/${tool.id}/test`, {
        parameters: data.parameters,
      })

      setTestResult(response.data)
    } catch (error: any) {
      console.error("Tool test failed:", error)
      setTestError(
        error.response?.data?.error || error.message || "Test failed"
      )
    } finally {
      setIsTesting(false)
    }
  }

  const onTestJq = async () => {
    if (!tool) return

    setIsTestingJq(true)
    setJqTestResult(null)
    setJqTestError(null)

    try {
      let sampleData
      try {
        sampleData = JSON.parse(jqSampleData)
      } catch (error) {
        throw new Error("Invalid JSON in sample data")
      }

      const response = await http.post(`/tools/${tool.id}/test-jq`, {
        data: sampleData,
        query: jqQuery,
        parameters: jqParameters,
      })

      setJqTestResult(response.data.result)
    } catch (error: any) {
      console.error("JQ test failed:", error)
      setJqTestError(
        error.response?.data?.error || error.message || "JQ test failed"
      )
    } finally {
      setIsTestingJq(false)
    }
  }

  const resetJqTest = () => {
    setJqTestResult(null)
    setJqTestError(null)
  }

  const onGenerateJq = async () => {
    if (!tool || !selectedProvider || !selectedModel || !jqDescription.trim())
      return

    setIsGeneratingJq(true)
    setGenerateJqError(null)

    try {
      let sampleData
      try {
        sampleData = JSON.parse(jqSampleData)
      } catch (error) {
        sampleData = null // Allow generation without sample data
      }

      const payload: any = {
        data: sampleData,
        description: jqDescription,
        provider_id: parseInt(selectedProvider),
        model: selectedModel,
      }

      if (jqExistingQuery.trim()) {
        payload.existing_query = jqExistingQuery
      }

      if (Object.keys(jqGenerationParameters).length > 0) {
        payload.parameters = jqGenerationParameters
      }

      const response = await http.post(`/tools/${tool.id}/generate-jq`, payload)

      setJqQuery(response.data.query)
      if (response.data.existing_query) {
        setJqExistingQuery(response.data.existing_query)
      }
    } catch (error: any) {
      console.error("JQ generation failed:", error)
      setGenerateJqError(
        error.response?.data?.error || error.message || "JQ generation failed"
      )
    } finally {
      setIsGeneratingJq(false)
    }
  }

  const resetTest = () => {
    setTestResult(null)
    setTestError(null)
    reset()
    resetJqTest()
    setGenerateJqError(null)
    setJqDescription("")
    setJqExistingQuery("")
    setJqGenerationParameters({})
    setJqGenerationParametersInput('{}')
    setJqParameters({})
    setJqParametersInput('{}')
  }

  if (isLoadingData) {
    return (
      <div className="py-8 px-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">
              {t("tools.loading", "Loading tool...")}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!tool) {
    return (
      <div className="py-8 px-8">
        <div className="text-center">
          <p className="text-muted-foreground">
            {t("tools.not_found", "Tool not found")}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8 px-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {t("tools.test_tool", "Test Tool")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {tool.display_name} ({tool.name})
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetTest}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("tools.reset", "Reset")}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/settings/tools/${tool.id}/edit`)}
          >
            {t("tools.edit_tool", "Edit Tool")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              {t("tools.test_input", "Test Input")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Tool Configuration Display */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  {t("tools.configuration", "Configuration")}
                </Label>
                <div className="bg-muted p-3 rounded-md space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">
                      {t("tools.type", "Type")}:
                    </span>
                    <Badge variant="secondary">{tool.type}</Badge>
                  </div>
                  {tool.type === "api" && tool.config && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">URL:</span>
                        <code className="text-xs bg-background px-2 py-1 rounded">
                          {tool.config.url}
                        </code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">
                          {t("tools.method", "Method")}:
                        </span>
                        <Badge variant="outline">
                          {tool.config.method || "GET"}
                        </Badge>
                      </div>
                      {tool.config.jq_query && (
                        <div className="space-y-1">
                          <span className="text-sm font-medium">JQ Query:</span>
                          <code className="text-xs bg-background px-2 py-1 rounded block">
                            {tool.config.jq_query}
                          </code>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Parameters Input */}
              {tool.parameters && tool.parameters.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    {t("tools.parameters", "Parameters")}
                  </Label>
                  <div className="space-y-4">
                    {tool.parameters.map((param: any, index: number) => (
                      <div key={index} className="space-y-2">
                        <Label className="text-sm">
                          {param.name}
                          {param.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                          <span className="text-muted-foreground ml-2">
                            ({param.type})
                          </span>
                        </Label>
                        {param.description && (
                          <p className="text-xs text-muted-foreground">
                            {param.description}
                          </p>
                        )}

                        {param.type === "boolean" ? (
                          <input
                            type="checkbox"
                            {...register(`parameters.${param.name}`)}
                            className="rounded border border-input"
                          />
                        ) : param.type === "number" ||
                          param.type === "integer" ? (
                          <Input
                            type="number"
                            step={param.type === "integer" ? "1" : "any"}
                            {...register(`parameters.${param.name}`)}
                            placeholder={`Enter ${param.name}`}
                          />
                        ) : param.type === "object" ? (
                          <Textarea
                            {...register(`parameters.${param.name}`)}
                            rows={4}
                            placeholder='{"key": "value"}'
                            className="font-mono text-sm"
                          />
                        ) : (
                          <Input
                            {...register(`parameters.${param.name}`)}
                            placeholder={`Enter ${param.name}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button type="submit" disabled={isTesting} className="w-full">
                {isTesting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t("tools.testing", "Testing...")}
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    {t("tools.run_test", "Run Test")}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>{t("tools.test_results", "Test Results")}</CardTitle>
          </CardHeader>
          <CardContent>
            {testError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <h4 className="text-red-800 font-medium mb-2">
                  {t("tools.test_error", "Test Error")}
                </h4>
                <pre className="text-red-700 text-sm whitespace-pre-wrap">
                  {testError}
                </pre>
              </div>
            )}

            {testResult && (
              <div className="space-y-4">
                {/* Tool Call Details */}
                <div>
                  <h4 className="font-medium mb-2">
                    {t("tools.tool_call_details", "Tool Call Details")}
                  </h4>
                  <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>{t("tools.tool_type", "Tool Type")}:</span>
                      <Badge variant="secondary">
                        {testResult.tool_call_details.tool_type}
                      </Badge>
                    </div>
                    {testResult.tool_call_details.method && (
                      <div className="flex justify-between">
                        <span>{t("tools.method", "Method")}:</span>
                        <Badge variant="outline">
                          {testResult.tool_call_details.method}
                        </Badge>
                      </div>
                    )}
                    {testResult.tool_call_details.url && (
                      <div className="flex justify-between">
                        <span>URL:</span>
                        <code className="text-xs bg-background px-2 py-1 rounded">
                          {testResult.tool_call_details.url}
                        </code>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>{t("tools.executed_at", "Executed At")}:</span>
                      <span className="text-xs">
                        {new Date(
                          testResult.tool_call_details.executed_at
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Response */}
                <div>
                  <h4 className="font-medium mb-2">
                    {t("tools.response", "Response")}
                  </h4>

                  {testResult.status_code && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-medium">
                        {t("tools.status_code", "Status Code")}:
                      </span>
                      <Badge
                        variant={
                          testResult.status_code >= 200 &&
                          testResult.status_code < 300
                            ? "default"
                            : "destructive"
                        }
                      >
                        {testResult.status_code}
                      </Badge>
                    </div>
                  )}

                  <div className="bg-muted p-3 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">
                        {t("tools.response_body", "Response Body")}
                        {testResult.result_count !== undefined && (
                          <Badge variant="outline" className="ml-2">
                            {testResult.result_count}{" "}
                            {t("tools.results", "results")}
                          </Badge>
                        )}
                      </Label>
                      {tool?.type === "api" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            try {
                              const jsonString =
                                typeof testResult.body === "string"
                                  ? testResult.body
                                  : JSON.stringify(testResult.body, null, 2)
                              setJqSampleData(jsonString)
                            } catch (error) {
                              console.error(
                                "Failed to convert response to JSON:",
                                error
                              )
                            }
                          }}
                          className="text-xs"
                        >
                          <Code className="mr-1 h-3 w-3" />
                          {t("tools.use_for_jq_test", "Use for JQ Test")}
                        </Button>
                      )}
                    </div>
                    <pre className="text-xs bg-background p-3 rounded border overflow-auto max-h-96 whitespace-pre-wrap">
                      {typeof testResult.body === "string"
                        ? testResult.body
                        : JSON.stringify(testResult.body, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {!testResult && !testError && (
              <div className="flex items-center flex-col py-8 text-muted-foreground">
                <Play className="h-12 w-12 mb-4 opacity-50" />
                <p>
                  {t(
                    "tools.run_test_to_see_results",
                    "Run a test to see the results here"
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* JQ Testing - Only show for API tools */}
        {tool?.type === "api" && (
          <Card className="lg:col-span-2" id="jq-testing-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                {t("tools.jq_testing", "JQ Testing")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Sample Data Input */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t("tools.sample_data", "Sample Data (JSON)")}
                  </Label>
                  <Textarea
                    value={jqSampleData}
                    onChange={(e) => setJqSampleData(e.target.value)}
                    rows={6}
                    placeholder='{"name": "John", "age": 30}'
                    className="font-mono text-sm"
                  />
                </div>

                {/* AI JQ Generation */}
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4" />
                    <Label className="text-sm font-medium">
                      {t("tools.ai_jq_generation", "AI JQ Generation")}
                    </Label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Provider Selection */}
                    <div className="space-y-2">
                      <Label className="text-sm">
                        {t("tools.provider", "Provider")}
                      </Label>
                      <Select
                        value={selectedProvider}
                        onValueChange={setSelectedProvider}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t(
                              "tools.select_provider",
                              "Select provider"
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {providers.map((provider) => (
                            <SelectItem
                              key={provider.id}
                              value={provider.id.toString()}
                            >
                              {provider.name} ({provider.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Model Selection */}
                    <div className="space-y-2">
                      <Label className="text-sm">
                        {t("tools.model", "Model")}
                      </Label>
                      <Select
                        value={selectedModel}
                        onValueChange={setSelectedModel}
                        disabled={!selectedProvider}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t(
                              "tools.select_model",
                              "Select model"
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {models.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Description Input */}
                  <div className="space-y-2 mb-4">
                    <Label className="text-sm">
                      {t(
                        "tools.describe_what_you_want",
                        "Describe what you want to extract"
                      )}
                    </Label>
                    <Textarea
                      value={jqDescription}
                      onChange={(e) => setJqDescription(e.target.value)}
                      rows={3}
                      placeholder={t(
                        "tools.describe_extraction",
                        "e.g., Extract all user names from the response"
                      )}
                      className="text-sm"
                    />
                  </div>

                  {/* Existing Query Input */}
                  <div className="space-y-2 mb-4">
                    <Label className="text-sm">
                      {t("tools.existing_jq_query", "Existing JQ Query (optional)")}
                    </Label>
                    <Input
                      value={jqExistingQuery}
                      onChange={(e) => setJqExistingQuery(e.target.value)}
                      placeholder=".name"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("tools.existing_query_help", "Provide an existing query to refine or improve")}
                    </p>
                  </div>

                  {/* Generation Parameters Input */}
                  <div className="space-y-2 mb-4">
                    <Label className="text-sm">
                      {t("tools.generation_parameters", "Parameters for Generation (JSON, optional)")}
                    </Label>
                    <Textarea
                      value={jqGenerationParametersInput}
                      onChange={(e) => {
                        const value = e.target.value
                        setJqGenerationParametersInput(value)
                        try {
                          const parsed = JSON.parse(value)
                          setJqGenerationParameters(parsed)
                        } catch (error) {
                          // Invalid JSON, keep current parsed value
                        }
                      }}
                      rows={3}
                      placeholder='{"user_id": "123", "filter": "active"}'
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("tools.generation_params_help", "Parameters that can be used in the generated query")}
                    </p>
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={onGenerateJq}
                    disabled={
                      isGeneratingJq ||
                      !selectedProvider ||
                      !selectedModel ||
                      !jqDescription.trim()
                    }
                    className="w-full"
                    variant="outline"
                  >
                    {isGeneratingJq ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        {t("tools.generating_jq", "Generating JQ...")}
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        {t("tools.generate_jq", "Generate JQ Query")}
                      </>
                    )}
                  </Button>

                  {/* Generation Error */}
                  {generateJqError && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      {generateJqError}
                    </div>
                  )}
                </div>

                {/* JQ Query Input */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t("tools.jq_query", "JQ Query")}
                  </Label>
                  <Input
                    value={jqQuery}
                    onChange={(e) => setJqQuery(e.target.value)}
                    placeholder=".name"
                    className="font-mono text-sm"
                  />
                  {tool.config?.jq_query && (
                    <p className="text-xs text-muted-foreground">
                      {t("tools.current_tool_jq", "Current tool JQ")}:{" "}
                      <code>{tool.config.jq_query}</code>
                    </p>
                  )}
                </div>

                {/* JQ Parameters Input */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t("tools.jq_parameters", "JQ Parameters (JSON, optional)")}
                  </Label>
                  <Textarea
                    value={jqParametersInput}
                    onChange={(e) => {
                      const value = e.target.value
                      setJqParametersInput(value)
                      try {
                        const parsed = JSON.parse(value)
                        setJqParameters(parsed)
                      } catch (error) {
                        // Invalid JSON, keep current parsed value
                      }
                    }}
                    rows={3}
                    placeholder='{"user_id": "123", "filter": "active"}'
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("tools.jq_params_help", "Parameters to pass to the JQ query for filtering")}
                  </p>
                </div>

                {/* Test Button */}
                <Button
                  onClick={onTestJq}
                  disabled={isTestingJq || !jqQuery.trim()}
                  className="w-full"
                >
                  {isTestingJq ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t("tools.testing_jq", "Testing JQ...")}
                    </>
                  ) : (
                    <>
                      <Code className="mr-2 h-4 w-4" />
                      {t("tools.test_jq", "Test JQ")}
                    </>
                  )}
                </Button>

                {/* JQ Test Results */}
                {jqTestError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <h5 className="text-red-800 font-medium mb-1">
                      {t("tools.jq_error", "JQ Error")}
                    </h5>
                    <pre className="text-red-700 text-xs whitespace-pre-wrap">
                      {jqTestError}
                    </pre>
                  </div>
                )}

                {jqTestResult !== null && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <h5 className="text-green-800 font-medium mb-1">
                      {t("tools.jq_result", "JQ Result")}
                    </h5>
                    <pre className="text-green-700 text-xs bg-white p-2 rounded border overflow-auto max-h-48 whitespace-pre-wrap">
                      {typeof jqTestResult === "string"
                        ? jqTestResult
                        : JSON.stringify(jqTestResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
