import * as React from "react"
import { cn } from "@/lib/utils"

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  variant?: "default" | "destructive"
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          variant === "default" && "text-gray-900 dark:text-white",
          variant === "destructive" && "text-red-600 dark:text-red-400",
          className
        )}
        {...props}
      />
    )
  }
)
Label.displayName = "Label"

export { Label }