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
    <header className="sticky top-0 z-50 w-full border-b border-[#2bbd2b]/10 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className="max-w-6xl mx-auto p-4 flex justify-between items-center">
        <h1 className="text-lg sm:text-2xl font-['Press_Start_2P'] text-[#2bbd2b]">
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