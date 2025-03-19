import WalletConnect from "@/components/WalletConnect";

interface HeaderProps {
  onConnect: (address: string) => void;
  onProfileClick: () => void;
  onLogout: () => void;
  connected: boolean;
  address?: string;
}

export default function Header({ onConnect, onProfileClick, onLogout, connected, address }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#2bbd2b]/10 bg-black backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className="container mx-auto p-3 flex justify-between items-center">
        <h1 className="text-sm font-mono uppercase tracking-wider text-[#2bbd2b]">
          Buzzy.Chat
        </h1>
        <div className="flex items-center gap-4">
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