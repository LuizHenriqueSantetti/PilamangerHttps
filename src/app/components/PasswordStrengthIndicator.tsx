import { Check, X } from 'lucide-react';
import { evaluatePasswordStrength } from '../utils/security';

interface PasswordStrengthIndicatorProps {
  password: string;
  isDark: boolean;
}

export function PasswordStrengthIndicator({ password, isDark }: PasswordStrengthIndicatorProps) {
  const strength = evaluatePasswordStrength(password);
  const textSub = isDark ? '#AFBFD3' : '#687E98';
  const muted = isDark ? '#111F35' : '#EEF6FA';
  const segments = [1, 2, 3, 4, 5];

  if (!password) return null;

  return (
    <div className="mt-2 rounded-xl p-3" style={{ backgroundColor: muted }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color: textSub }}>Forca da senha</span>
        <span className="text-xs font-bold" style={{ color: strength.color }}>{strength.label}</span>
      </div>
      <div className="grid grid-cols-5 gap-1 mb-2">
        {segments.map(segment => (
          <div
            key={segment}
            className="h-1.5 rounded-full"
            style={{ backgroundColor: strength.score >= segment ? strength.color : (isDark ? '#31455F' : '#DCE6EC') }}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
        {strength.requirements.map(item => (
          <div key={item.id} className="flex items-center gap-1.5 text-xs" style={{ color: item.met ? strength.color : textSub }}>
            {item.met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
