import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/utils/cn';

type ContainerProps = ComponentPropsWithoutRef<'div'> & {
  width?: 'reading' | 'compact' | 'default' | 'wide' | 'full';
};

export function Container({
  width = 'default',
  className,
  ...props
}: ContainerProps) {
  return (
    <div
      {...props}
      className={cn(
        'container',
        `container--${width}`,
        className,
      )}
    />
  );
}
