import Link from "next/link"
import { LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

interface ISettingCardProps {
  title: string
  description: string
  icon: LucideIcon
  href: string
}

export default function SettingCard(props: ISettingCardProps) {
  return (
    <Link href={props.href}>
      <Card className="group h-full relative overflow-hidden duration-300 ease-in hover:scale-[102%] hover:shadow-xl active:scale-100 hover:border-primary/50">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardContent className="pt-6 relative">
          <div className="flex gap-6">
            <div className="icon self-start rounded-md bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors duration-300">
              <props.icon className="size-6 text-primary group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div className="content w-full">
              <h3 className="text-lg font-semibold tracking-tight group-hover:text-primary transition-colors duration-300">
                {props.title}
              </h3>
              <p className="text-muted-foreground">{props.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
