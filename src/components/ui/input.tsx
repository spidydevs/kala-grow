import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'paper'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = 'default', ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
          {
            'default': 'shadow-sm hover:shadow-md focus:shadow-lg',
            'paper': 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.4)] focus:shadow-[0_6px_20px_-2px_rgba(0,0,0,0.2)] dark:focus:shadow-[0_6px_20px_-2px_rgba(0,0,0,0.5)]'
          }[variant],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }