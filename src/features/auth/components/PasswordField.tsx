import { useState } from 'react';
import type { ComponentProps } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { Input } from '@/components/ui/Input';
import { IconButton } from '@/components/ui/Button';

type Props = Omit<ComponentProps<typeof Input>, 'type'>;

export function PasswordField(props: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <Input {...props} type={visible ? 'text' : 'password'} />

      <IconButton
        className="password-toggle"
        icon={visible ? EyeOff : Eye}
        size="sm"
        disabled={props.disabled}
        aria-label={visible ? `Hide ${props.label}` : `Show ${props.label}`}
        selected={visible}
        onClick={() => setVisible((current) => !current)}
      />
    </div>
  );
}
