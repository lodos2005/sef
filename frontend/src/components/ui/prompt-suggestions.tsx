interface PromptSuggestionsProps {
  label: string
  append: (message: { role: "user"; content: string }) => void
  suggestions: string[]
}

export function PromptSuggestions({
  label,
  append,
  suggestions,
}: PromptSuggestionsProps) {
  return (
    <div className="space-y-8 text-center my-8">
      <div className="inline-flex items-center bg-white rounded-full border border-black/[0.08] shadow-xs text-xs font-medium py-1 px-3 text-foreground/80">
        <svg
          className="me-1.5 text-muted-foreground/70 -ms-1"
          width="14"
          height="14"
          fill="none"
        >
          <g clipPath="url(#icon-a)">
            <path
              fill="url(#icon-b)"
              d="m7 .333 2 3.667 3.667 2-3.667 2-2 3.667-2-3.667L1.333 6l3.667-2L7 .333Z"
            />
          </g>
          <defs>
            <linearGradient
              id="icon-b"
              x1="7"
              x2="7"
              y1=".333"
              y2="11.667"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#FDE68A" />
              <stop offset="1" stopColor="#F59E0B" />
            </linearGradient>
            <clipPath id="icon-a">
              <path fill="#fff" d="M0 0h14v14H0z" />
            </clipPath>
          </defs>
        </svg>
        {label}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 text-sm">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => append({ role: "user", content: suggestion })}
            className="text-left h-max rounded-xl border bg-background p-4 hover:bg-muted transition-colors hover:shadow-sm"
          >
            <p>{suggestion}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
