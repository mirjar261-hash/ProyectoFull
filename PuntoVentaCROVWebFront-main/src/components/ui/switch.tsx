import * as React from 'react'

import { cn } from '@/lib/utils'

export interface SwitchProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, onCheckedChange, onChange, ...props }, ref) => (
    <label
      className={cn(
        'relative inline-flex h-6 w-11 cursor-pointer items-center',
        className,
      )}
    >
      <input
        type="checkbox"
        ref={ref}
        className="peer sr-only"
        onChange={(e) => {
          onChange?.(e)
          onCheckedChange?.(e.target.checked)
        }}
        {...props}
      />
      <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-background shadow transition peer-checked:translate-x-5" />
      <span className="h-6 w-11 rounded-full bg-input transition peer-checked:bg-orange-500 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-orange-500" />
    </label>
  ),
)
Switch.displayName = 'Switch'

export { Switch }
