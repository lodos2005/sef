import {
  CloudCog,
  Code2,
  FileText,
  MessageCircleMoreIcon,
  ScrollText,
  Settings as SettingsIcon,
  Users2,
  Wrench
} from "lucide-react"

export const Settings = {
  system: [
    {
      id: "providers",
      title: "Sağlayıcılar",
      description: "Sistemdeki AI sağlayıcılarını yönetin.",
      icon: CloudCog,
      href: "/settings/providers",
    },
    {
      id: "chatbots",
      title: "Chatbotlar",
      description: "Sistemdeki chatbot türlerini yönetin, sistem promptlarını düzenleyebilir ve yenilerini ekleyebilirsiniz.",
      icon: MessageCircleMoreIcon,
      href: "/settings/chatbots",
    },
    {
      id: "tools",
      title: "Araçlar",
      description: "AI araçlarınızı ve yapılandırmalarınızı yönetin.",
      icon: Wrench,
      href: "/settings/tools",
    },
    {
      id: "documents",
      title: "Belgeler",
      description: "RAG için döküman ve bilgi tabanlarını yönetin.",
      icon: FileText,
      href: "/settings/documents",
    },
    {
      id: "sessions",
      title: "Oturumlar",
      description: "Sistemdeki sohbet oturumlarını görüntüleyin ve yönetin.",
      icon: ScrollText,
      href: "/settings/sessions",
    },
    {
      id: "embedding",
      title: "Gömme Ayarları",
      description: "RAG için gömme modeli ve vektör yapılandırmasını yönetin.",
      icon: SettingsIcon,
      href: "/settings/embedding",
    },
    {
      id: "widget",
      title: "Widget Entegrasyonu",
      description: "Şef chat widget'ını web sitenize entegre edin ve yapılandırın.",
      icon: Code2,
      href: "/settings/widget",
    },
  ],
}
