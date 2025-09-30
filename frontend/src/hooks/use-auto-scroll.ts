import { useEffect, useRef, useState } from "react"

// How many pixels from the bottom of the container to enable auto-scroll
const ACTIVATION_THRESHOLD = 50
// Minimum pixels of scroll-up movement required to disable auto-scroll
const MIN_SCROLL_UP_THRESHOLD = 10

export function useAutoScroll(dependencies: React.DependencyList) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const previousScrollTop = useRef<number | null>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const [isScrollable, setIsScrollable] = useState(false)

  const checkIfScrollable = () => {
    if (containerRef.current) {
      // Check if we're inside a ScrollArea component
      const scrollAreaViewport = containerRef.current.closest('[data-slot="scroll-area-viewport"]')
      const scrollElement = scrollAreaViewport || containerRef.current
      
      const { scrollHeight, clientHeight } = scrollElement
      const scrollableContent = scrollHeight > clientHeight
      setIsScrollable(scrollableContent)
      
      return scrollableContent
    }
    return false
  }

  const scrollToBottom = (smooth = false) => {
    if (containerRef.current) {
      // Check if we're inside a ScrollArea component
      const scrollAreaViewport = containerRef.current.closest('[data-slot="scroll-area-viewport"]')
      const scrollElement = scrollAreaViewport || containerRef.current
      
      if (smooth) {
        scrollElement.scrollTo({
          top: scrollElement.scrollHeight,
          behavior: 'smooth'
        })
      } else {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }

  const scrollToBottomSmooth = () => {
    scrollToBottom(true)
  }

  const handleScroll = () => {
    if (containerRef.current) {
      // Check if we're inside a ScrollArea component
      const scrollAreaViewport = containerRef.current.closest('[data-slot="scroll-area-viewport"]')
      const scrollElement = scrollAreaViewport || containerRef.current
      
      const { scrollTop, scrollHeight, clientHeight } = scrollElement

      // Check if content is scrollable
      checkIfScrollable()

      const distanceFromBottom = Math.abs(
        scrollHeight - scrollTop - clientHeight
      )

      const isScrollingUp = previousScrollTop.current
        ? scrollTop < previousScrollTop.current
        : false

      const scrollUpDistance = previousScrollTop.current
        ? previousScrollTop.current - scrollTop
        : 0

      const isDeliberateScrollUp =
        isScrollingUp && scrollUpDistance > MIN_SCROLL_UP_THRESHOLD

      if (isDeliberateScrollUp) {
        setShouldAutoScroll(false)
      } else {
        const isScrolledToBottom = distanceFromBottom < ACTIVATION_THRESHOLD
        setShouldAutoScroll(isScrolledToBottom)
      }

      previousScrollTop.current = scrollTop
    }
  }

  const handleTouchStart = () => {
    setShouldAutoScroll(false)
  }

  useEffect(() => {
    if (containerRef.current) {
      // Check if we're inside a ScrollArea component
      const scrollAreaViewport = containerRef.current.closest('[data-slot="scroll-area-viewport"]')
      const scrollElement = scrollAreaViewport || containerRef.current
      
      previousScrollTop.current = scrollElement.scrollTop
      // Check initial scrollable state
      checkIfScrollable()
    }
  }, [])

  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom()
    }
    // Check scrollable state when dependencies change
    checkIfScrollable()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  return {
    containerRef,
    scrollToBottom,
    scrollToBottomSmooth,
    handleScroll,
    shouldAutoScroll,
    handleTouchStart,
    isScrollable,
  }
}
