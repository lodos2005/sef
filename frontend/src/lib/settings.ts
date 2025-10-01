import {
  CloudCog,
  MessageCircleMoreIcon,
  ScrollText,
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
      description: "Sistemdeki chatbot türlerini yönetebilir, sistem promptlarını düzenleyebilir ve yenilerini ekleyebilirsiniz.",
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
      id: "users",
      title: "Kullanıcılar",
      description:
        "Bu sayfa aracılığıyla kullanıcılara roller ekleyebilir, kullanıcı profillerini düzenleyebilir ve yenilerini ekleyebilirsiniz.",
      icon: Users2,
      href: "/settings/users",
    },
    {
      id: "sessions",
      title: "Oturumlar",
      description: "Sistemdeki sohbet oturumlarını görüntüleyin ve yönetin.",
      icon: ScrollText,
      href: "/settings/sessions",
    },
  ],
}
