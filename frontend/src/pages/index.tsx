import dynamic from "next/dynamic"
import { useTranslation } from "react-i18next"

const DateTimeView = dynamic(() => import("@/components/dashboard/date-time"), {
  ssr: false,
})

export default function IndexPage() {
  const { t } = useTranslation("dashboard")

  return (
    <div
      className="flex flex-col"
      style={{ height: "var(--container-height)" }}
    >
      <div className="title flex items-center justify-between gap-3 overflow-hidden p-8">
        <h2 className="text-2xl font-semibold">{t("title", "Pano")}</h2>
        <span className="font-medium text-muted-foreground">
          <DateTimeView />
        </span>
      </div>
    </div>
  )
}
