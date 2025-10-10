import { useTranslation } from "react-i18next"
import { Copy, Check } from "lucide-react"
import { useState, useEffect, useCallback } from "react"

import PageHeader from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/ui/icons"

// Widget global type tanımı
declare global {
  interface Window {
    SefChat?: {
      init: (config: any) => void
      open: () => void
      close: () => void
      toggle: () => void
    }
  }
}

export default function WidgetSettingsPage() {
  const { t } = useTranslation("settings")
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [widgetLoaded, setWidgetLoaded] = useState(false)
  const [isWidgetOpen, setIsWidgetOpen] = useState(false)

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleWidgetAction = (action: "open" | "close" | "toggle") => {
    try {
      if (typeof window !== "undefined" && window.SefChat && window.SefChat[action]) {
        window.SefChat[action]()
        
        // State güncelle
        if (action === "open") {
          setIsWidgetOpen(true)
        } else if (action === "close") {
          setIsWidgetOpen(false)
        } else if (action === "toggle") {
          setIsWidgetOpen(!isWidgetOpen)
        }
      } else {
        console.warn("Widget not loaded or action not available:", action)
        // Widget yüklenmediyse tekrar yüklemeyi dene
        loadWidget()
      }
    } catch (error) {
      console.error("Widget action error:", error)
    }
  }

  const loadWidget = useCallback(() => {
    if (typeof window === "undefined") return

    // Widget zaten yüklü ve init edilmiş mi kontrol et
    const existingFab = document.getElementById('sef-chat-fab')
    const existingPopover = document.getElementById('sef-chat-popover')
    
    if (window.SefChat && existingFab && existingPopover) {
      console.log("Widget already fully initialized")
      setWidgetLoaded(true)
      return
    }

    // Widget global'de var ama DOM'da yok, init et
    if (window.SefChat) {
      console.log("SefChat exists, initializing...")
      try {
        window.SefChat.init({
          baseUrl: window.location.origin,
          position: "bottom-right",
          width: 400,
          height: 600,
          buttonColor: "oklch(0.21 0.006 285.885)",
        })
        setWidgetLoaded(true)
        console.log("Widget initialized successfully")
      } catch (error) {
        console.error("Widget init error:", error)
      }
      return
    }

    // Script zaten var mı kontrol et
    const existingScript = document.querySelector('script[src="/chat-widget.js"]') ||
                          document.querySelector('script#sef-chat-widget-script')
    
    if (existingScript) {
      console.log("Script exists, waiting for SefChat...")
      // Polling ile widget'ı bekle
      let attempts = 0
      const maxAttempts = 50 // 5 saniye
      const checkInterval = setInterval(() => {
        attempts++
        if (window.SefChat) {
          console.log("SefChat found after", attempts * 100, "ms")
          clearInterval(checkInterval)
          try {
            window.SefChat.init({
              baseUrl: window.location.origin,
              position: "bottom-right",
              width: 400,
              height: 600,
              buttonColor: "oklch(0.21 0.006 285.885)",
            })
            setWidgetLoaded(true)
            console.log("Widget initialized successfully")
          } catch (error) {
            console.error("Widget init error:", error)
          }
        } else if (attempts >= maxAttempts) {
          console.error("Timeout waiting for SefChat")
          clearInterval(checkInterval)
        }
      }, 100)
      return
    }

    // Yeni script ekle
    console.log("Loading widget script...")
    const script = document.createElement("script")
    script.src = "/chat-widget.js"
    script.id = "sef-chat-widget-script"
    
    script.onload = () => {
      console.log("Script loaded, checking for SefChat...")
      // Script yüklendi, widget'ı bekle
      let attempts = 0
      const maxAttempts = 30
      const checkInterval = setInterval(() => {
        attempts++
        if (window.SefChat) {
          console.log("SefChat initialized successfully")
          clearInterval(checkInterval)
          try {
            window.SefChat.init({
              baseUrl: window.location.origin,
              position: "bottom-right",
              width: 400,
              height: 600,
              buttonColor: "oklch(0.21 0.006 285.885)",
            })
            setWidgetLoaded(true)
            console.log("Widget fully ready")
          } catch (error) {
            console.error("Widget init error:", error)
          }
        } else if (attempts >= maxAttempts) {
          console.error("SefChat not found after script load")
          clearInterval(checkInterval)
        }
      }, 100)
    }

    script.onerror = (error) => {
      console.error("Failed to load chat widget script:", error)
    }

    document.head.appendChild(script)
  }, [])

  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""

  // Widget'ı yükle
  useEffect(() => {
    loadWidget()

    // Event listeners
    const handleChatOpen = () => setIsWidgetOpen(true)
    const handleChatClose = () => setIsWidgetOpen(false)

    window.addEventListener("sef-chat-opened", handleChatOpen)
    window.addEventListener("sef-chat-closed", handleChatClose)

    return () => {
      window.removeEventListener("sef-chat-opened", handleChatOpen)
      window.removeEventListener("sef-chat-closed", handleChatClose)
      
      // Widget'ı kapat ama script'i kaldırma
      if (window.SefChat && window.SefChat.close) {
        try {
          window.SefChat.close()
        } catch (error) {
          console.error("Error closing widget:", error)
        }
      }
    }
  }, [loadWidget])

  const codeExamples = [
    {
      title: t("widget.example_1_title"),
      description: t("widget.example_1_description"),
      code: `<!-- ${t("widget.example_1_title")} -->
<script src="${baseUrl}/chat-widget.js"
        data-sef-position="bottom-right"></script>`,
    },
    {
      title: t("widget.example_2_title"),
      description: t("widget.example_2_description"),
      code: `<!-- ${t("widget.example_2_title")} -->
<script src="${baseUrl}/chat-widget.js"
        data-sef-session-id="OTURUM_ID_BURAYA"
        data-sef-position="bottom-right"></script>`,
    },
    {
      title: t("widget.example_3_title"),
      description: t("widget.example_3_description"),
      code: `<!-- ${t("widget.example_3_title")} -->
<script src="${baseUrl}/chat-widget.js"></script>
<script>
  SefChat.init({
    baseUrl: '${baseUrl}',
    position: 'bottom-right',
    width: 400,
    height: 600,
    buttonColor: '#0070f3'
  });
</script>`,
    },
  ]

  const apiMethods = [
    {
      title: "SefChat.open()",
      description: t("widget.api_open"),
    },
    {
      title: "SefChat.close()",
      description: t("widget.api_close"),
    },
    {
      title: "SefChat.toggle()",
      description: t("widget.api_toggle"),
    },
  ]

  const configOptions = [
    {
      name: "sessionId",
      type: "string",
      optional: true,
      description: t("widget.config_session_id"),
    },
    {
      name: "baseUrl",
      type: "string",
      optional: true,
      description: t("widget.config_base_url"),
    },
    {
      name: "position",
      type: "string",
      optional: true,
      description: t("widget.config_position"),
    },
    {
      name: "width",
      type: "number",
      optional: true,
      description: t("widget.config_width"),
    },
    {
      name: "height",
      type: "number",
      optional: true,
      description: t("widget.config_height"),
    },
    {
      name: "buttonColor",
      type: "string",
      optional: true,
      description: t("widget.config_button_color"),
    },
    {
      name: "zIndex",
      type: "number",
      optional: true,
      description: t("widget.config_z_index"),
    },
  ]

  return (
    <>
      <PageHeader
        title={t("widget.title")}
        description={t("widget.description")}
      />

      <div className="h-full flex-1 flex-col space-y-8 p-8 pt-2 md:flex">
        {/* Yeni Özellik: Chatbot Seçimi */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold">
            <span>🎯</span>
            {t("widget.chatbot_selection_title")}
          </h3>
          <p className="mb-4 text-muted-foreground">
            {t("widget.chatbot_selection_description")}
          </p>
          <div className="rounded-lg bg-muted p-4">
            <h4 className="mb-2 font-semibold text-sm">
              {t("widget.how_it_works")}
            </h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>✅ {t("widget.how_it_works_1")}</li>
              <li>✅ {t("widget.how_it_works_2")}</li>
              <li>✅ {t("widget.how_it_works_3")}</li>
              <li>✅ {t("widget.how_it_works_4")}</li>
              <li>✅ {t("widget.how_it_works_5")}</li>
            </ul>
          </div>
        </div>

        {/* Hızlı Başlangıç */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">
            {t("widget.quick_start")}
          </h3>
          <div className="space-y-6">
            {codeExamples.map((example, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">{example.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {example.description}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(example.code, index)}
                  >
                    {copiedIndex === index ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        {t("widget.copied")}
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        {t("widget.copy")}
                      </>
                    )}
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-primary/5 p-4 text-sm">
                  <code>{example.code}</code>
                </pre>
              </div>
            ))}
          </div>
        </div>

        {/* Özellikler */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">{t("widget.features")}</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border p-4">
              <h4 className="mb-2 flex items-center gap-2 font-semibold">
                <span>🤖</span>
                {t("widget.feature_1_title")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t("widget.feature_1_description")}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h4 className="mb-2 flex items-center gap-2 font-semibold">
                <span>📜</span>
                {t("widget.feature_2_title")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t("widget.feature_2_description")}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h4 className="mb-2 flex items-center gap-2 font-semibold">
                <span>🎨</span>
                {t("widget.feature_3_title")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t("widget.feature_3_description")}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h4 className="mb-2 flex items-center gap-2 font-semibold">
                <span>📱</span>
                {t("widget.feature_4_title")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t("widget.feature_4_description")}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h4 className="mb-2 flex items-center gap-2 font-semibold">
                <span>⚡</span>
                {t("widget.feature_5_title")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t("widget.feature_5_description")}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h4 className="mb-2 flex items-center gap-2 font-semibold">
                <span>🔧</span>
                {t("widget.feature_6_title")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t("widget.feature_6_description")}
              </p>
            </div>
          </div>
        </div>

        {/* API Metodları */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">
            {t("widget.api_methods")}
          </h3>
          <div className="space-y-4">
            {apiMethods.map((method, index) => (
              <div key={index} className="rounded-lg border p-4">
                <code className="mb-2 block font-mono text-sm font-semibold">
                  {method.title}
                </code>
                <p className="text-sm text-muted-foreground">
                  {method.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Konfigürasyon Seçenekleri */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">
            {t("widget.config_options")}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left font-semibold">
                    {t("widget.config_name")}
                  </th>
                  <th className="pb-2 text-left font-semibold">
                    {t("widget.config_type")}
                  </th>
                  <th className="pb-2 text-left font-semibold">
                    {t("widget.config_description_label")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {configOptions.map((option, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-3">
                      <code className="text-sm">{option.name}</code>
                      {option.optional && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({t("widget.optional")})
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <code className="text-sm text-muted-foreground">
                        {option.type}
                      </code>
                    </td>
                    <td className="py-3 text-sm text-muted-foreground">
                      {option.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Not */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
          <p className="text-sm">
            <strong>{t("widget.note_title")}</strong>{" "}
            {t("widget.note_description")}
          </p>
        </div>

        {/* Canlı Demo */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">
            {t("widget.live_demo")}
          </h3>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("widget.live_demo_description")}
            </p>
            
            {/* Debug Bilgisi */}
            {process.env.NODE_ENV === "development" && (
              <div className="rounded-lg bg-muted p-3 text-xs font-mono">
                <div>Widget Loaded: {widgetLoaded ? "✅ Yes" : "❌ No"}</div>
                <div>SefChat Available: {typeof window !== "undefined" && window.SefChat ? "✅ Yes" : "❌ No"}</div>
                <div>FAB Button: {typeof document !== "undefined" && document.getElementById('sef-chat-fab') ? "✅ Exists" : "❌ Missing"}</div>
                <div>Popover: {typeof document !== "undefined" && document.getElementById('sef-chat-popover') ? "✅ Exists" : "❌ Missing"}</div>
                <div>Widget State: {isWidgetOpen ? "🟢 Open" : "⚪ Closed"}</div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {/* Yeniden Yükle Butonu */}
              {!widgetLoaded && (
                <Button
                  variant="ghost"
                  onClick={loadWidget}
                  size="sm"
                >
                  🔄 {t("widget.demo_reload")}
                </Button>
              )}
            </div>
            
            {!widgetLoaded && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950">
                <p className="text-sm text-orange-900 dark:text-orange-100">
                  ⚠️ {t("widget.demo_loading")}
                </p>
                <p className="mt-1 text-xs text-orange-700 dark:text-orange-300">
                  {t("widget.demo_loading_hint")}
                </p>
              </div>
            )}
            
            {widgetLoaded && (
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm">
                  ✅ {t("widget.demo_loaded")}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("widget.demo_hint")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
