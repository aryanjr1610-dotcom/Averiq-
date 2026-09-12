import * as React from 'react';
import { cn } from '@/lib/cn';

export type DividerProps = React.HTMLAttributes<HTMLHRElement> & {
  vertical?: boolean;
};

export function Divider({ vertical = false, className, ...props }: DividerProps) {
  return (
    <hr
      className={cn(
        vertical
          ? 'mx-2 inline-block h-6 w-px border-none bg-edge-subtle'
          : 'my-4 h-px w-full border-none bg-edge-subtle',
        className,
      )}
      {...props}
    />
  );
}
