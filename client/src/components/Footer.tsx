import { Building2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full border-t border-[#00ff00]/10 bg-black">
      <div className="max-w-6xl mx-auto py-6 px-4 flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-[#00ff00] bg-[#00ff00]/5 py-3 px-6 rounded-full border border-[#00ff00]/20 hover:border-[#00ff00]/40 transition-colors font-['Press_Start_2P'] text-xs">
          <span>Powered By</span>
          <Building2 className="h-5 w-5" />
          <span>Beaver Foundation</span>
        </div>
      </div>
    </footer>
  );
}