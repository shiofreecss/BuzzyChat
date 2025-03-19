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
      <div className="container max-w-6xl mx-auto px-4 py-2 sm:py-4 flex justify-between items-center">
        <h1 className="text-sm sm:text-3xl font-['Press_Start_2P'] text-[#2bbd2b]">
          Buzzy.Chat
        </h1>
        <WalletConnect
          onConnect={onConnect}
          onProfileClick={onProfileClick}
          onLogout={onLogout}
          connected={connected}
          address={address}
        />
      </div>
    </header>
  );
}