import { useAuthStore } from '../../store/authStore';
import { formatDate } from '../../lib/utils';

export function Header() {
  const officer = useAuthStore((s) => s.officer);

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{formatDate(new Date())}</span>
        <div className="h-4 w-px bg-border" />
        <span className="font-medium text-foreground">{officer?.fullName}</span>
      </div>
    </header>
  );
}
