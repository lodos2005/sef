import { useState } from "react"
import { X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface KeyValuePair {
  key: string
  value: string
}

interface KeyValueInputProps {
  value: Record<string, string>
  onChange: (value: Record<string, string>) => void
  placeholder?: {
    key: string
    value: string
  }
  className?: string
}

export function KeyValueInput({
  value,
  onChange,
  placeholder = { key: "Key", value: "Value" },
  className = ""
}: KeyValueInputProps) {
  const [pairs, setPairs] = useState<KeyValuePair[]>(
    Object.entries(value || {}).map(([key, val]) => ({ key, value: val }))
  )

  const updatePairs = (newPairs: KeyValuePair[]) => {
    setPairs(newPairs)
    const obj: Record<string, string> = {}
    newPairs.forEach(pair => {
      if (pair.key.trim()) {
        obj[pair.key.trim()] = pair.value
      }
    })
    onChange(obj)
  }

  const addPair = () => {
    const newPairs = [...pairs, { key: "", value: "" }]
    updatePairs(newPairs)
  }

  const removePair = (index: number) => {
    const newPairs = pairs.filter((_, i) => i !== index)
    updatePairs(newPairs)
  }

  const updatePair = (index: number, field: "key" | "value", newValue: string) => {
    const newPairs = pairs.map((pair, i) =>
      i === index ? { ...pair, [field]: newValue } : pair
    )
    updatePairs(newPairs)
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {pairs.map((pair, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            placeholder={placeholder.key}
            value={pair.key}
            onChange={(e) => updatePair(index, "key", e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder={placeholder.value}
            value={pair.value}
            onChange={(e) => updatePair(index, "value", e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => removePair(index)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addPair}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Ekle
      </Button>
    </div>
  )
}
