import * as React from 'react'
import { cn } from '@/lib/utils'

interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Called when the checked state changes. Mirrors the Radix UI API so that
   * components using `onCheckedChange` do not break when rendered as a plain
   * HTML input.
   */
  onCheckedChange?: (checked: boolean) => void
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, onChange, ...props }, ref) => (
    <input
      type="checkbox"
      ref={ref}
      className={cn(
        'h-4 w-4 rounded border border-input text-orange-500',
        className,
      )}
      onChange={(e) => {
        onChange?.(e)
        onCheckedChange?.(e.target.checked)
      }}
      {...props}
    />
  ),
)
Checkbox.displayName = 'Checkbox'
