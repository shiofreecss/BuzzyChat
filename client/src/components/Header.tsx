import WalletConnect from "@/components/WalletConnect";
import { ToggleLeft, ToggleRight } from "lucide-react";

interface HeaderProps {
  onConnect: (address: string) => void;
  onProfileClick: () => void;
  onLogout: () => void;
  connected: boolean;
  address?: string;
  toggleMatrixCursor?: () => void;
  matrixCursorEnabled?: boolean;
}

export default function Header({ 
  onConnect, 
  onProfileClick, 
  onLogout, 
  connected, 
  address,
  toggleMatrixCursor,
  matrixCursorEnabled = true
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#f4b43e]/20 bg-black backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className="container mx-auto p-3 flex justify-between items-center">
        <h1 className="text-sm font-mono uppercase tracking-wider text-[#f4b43e] [text-shadow:_0_0_10px_rgb(244_180_62_/_40%)]">
          Buzzy.Chat
        </h1>
        <div className="flex items-center gap-4">
          {toggleMatrixCursor && (
            <button 
              onClick={toggleMatrixCursor}
              className="flex items-center gap-1 text-[10px] text-[#f4b43e] py-1 px-2 rounded border border-[#f4b43e]/20 hover:border-[#f4b43e]/40"
            >
              {matrixCursorEnabled ? (
                <>
                  <ToggleRight className="h-3 w-3" />
                  <span>Matrix FX</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="h-3 w-3" />
                  <span>Matrix FX</span>
                </>
              )}
            </button>
          )}
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