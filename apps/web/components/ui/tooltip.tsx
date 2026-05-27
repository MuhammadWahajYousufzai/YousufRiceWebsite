"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  className?: string
}

const Tooltip = ({ children, content, className }: TooltipProps) => {
  const [isVisible, setIsVisible] = React.useState(false)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })
  const triggerRef = React.useRef<HTMLDivElement>(null)
  
  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + rect.width / 2 + window.scrollX
      })
      setIsVisible(true)
    }
  }
  
  const handleMouseLeave = () => {
    setIsVisible(false)
  }
  
  return (
    <div className="relative inline-block">
      <div 
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>
      {isVisible && (
        <div 
          className={cn(
            "absolute z-50 px-2 py-1 text-sm bg-gray-800 text-white rounded shadow-lg",
            "transform -translate-x-1/2 mt-1",
            className
          )}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}

// Simplified versions of the other components for compatibility
const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => children
const TooltipTrigger: React.FC<{ asChild?: boolean; children: React.ReactNode }> = ({ children }) => <>{children}</>
const TooltipContent: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
