import WalletConnect from "@/components/WalletConnect";
import ThemeToggle from "@/components/ThemeToggle";

interface HeaderProps {
  onConnect: (address: string) => void;
  onProfileClick: () => void;
  onLogout: () => void;
  connected: boolean;
  address?: string;
}

export default function Header({ onConnect, onProfileClick, onLogout, connected, address }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-6xl mx-auto p-4 flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-600">
          Buzzy.Chat
        </h1>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <WalletConnect
            onConnect={onConnect}
            onProfileClick={onProfileClick}
            onLogout={onLogout}
            connected={connected}
            address={address}
          />
        </div>
      </div>
    </header>
  );
}