import {
  CloudCog,
  MessageCircleMoreIcon,
  ScrollText,
  Users2
} from "lucide-react"

export const Settings = {
  system: [
    {
      id: "users",
      title: "Kullanıcılar",
      description:
        "Bu sayfa aracılığıyla kullanıcılara roller ekleyebilir, kullanıcı profillerini düzenleyebilir ve yenilerini ekleyebilirsiniz.",
      icon: Users2,
      href: "/settings/users",
    },
    {
      id: "chatbots",
      title: "Chatbotlar",
      description: "Sistemdeki chatbot türlerini yönetebilir, sistem promptlarını düzenleyebilir ve yenilerini ekleyebilirsiniz.",
      icon: MessageCircleMoreIcon,
      href: "/settings/chatbots",
    },
    {
      id: "providers",
      title: "Sağlayıcılar",
      description: "Sistemdeki AI sağlayıcılarını yönetin.",
      icon: CloudCog,
      href: "/settings/providers",
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
