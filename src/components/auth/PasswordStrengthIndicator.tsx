import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface PasswordRequirement {
  label: string;
  met: boolean;
}

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const analysis = useMemo(() => {
    const requirements: PasswordRequirement[] = [
      { label: 'At least 6 characters', met: password.length >= 6 },
      { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
      { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
      { label: 'Contains a number', met: /[0-9]/.test(password) },
      { label: 'Contains special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    ];

    const metCount = requirements.filter(r => r.met).length;
    
    let strength: { label: string; color: string; score: number };
    if (metCount === 0) {
      strength = { label: 'Very Weak', color: 'bg-destructive', score: 0 };
    } else if (metCount <= 2) {
      strength = { label: 'Weak', color: 'bg-destructive', score: 25 };
    } else if (metCount === 3) {
      strength = { label: 'Fair', color: 'bg-yellow-500', score: 50 };
    } else if (metCount === 4) {
      strength = { label: 'Good', color: 'bg-primary', score: 75 };
    } else {
      strength = { label: 'Strong', color: 'bg-green-500', score: 100 };
    }

    return { requirements, strength };
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-3 mt-2">
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={`font-medium ${
            analysis.strength.score <= 25 ? 'text-destructive' : 
            analysis.strength.score === 50 ? 'text-yellow-600' :
            analysis.strength.score === 75 ? 'text-primary' : 'text-green-600'
          }`}>
            {analysis.strength.label}
          </span>
        </div>
        <Progress 
          value={analysis.strength.score} 
          className="h-1.5"
        />
      </div>
      
      <div className="grid grid-cols-1 gap-1">
        {analysis.requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            {req.met ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground" />
            )}
            <span className={req.met ? 'text-green-600' : 'text-muted-foreground'}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
