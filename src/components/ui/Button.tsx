import { motion, type HTMLMotionProps } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { forwardRef } from 'react'
import { buttonClassNames } from './buttonStyles'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref' | 'children'> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  children?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <motion.button
        ref={ref}
        type={props.type ?? 'button'}
        whileTap={disabled || isLoading ? undefined : { scale: 0.97 }}
        transition={{ duration: 0.12 }}
        disabled={disabled || isLoading}
        className={buttonClassNames(variant, size, className)}
        {...props}
      >
        {isLoading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {size === 'icon' ? (
          !isLoading && children
        ) : (
          <>
            {!isLoading && leftIcon}
            {children}
            {!isLoading && rightIcon}
          </>
        )}
      </motion.button>
    )
  },
)

Button.displayName = 'Button'
