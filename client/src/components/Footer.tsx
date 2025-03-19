import { Building2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full border-t border-[#f4b43e]/10 bg-black">
      <div className="max-w-6xl mx-auto py-4 sm:py-6 px-4 flex items-center justify-center">
        <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-[#f4b43e] bg-[#f4b43e]/5 py-2 sm:py-3 px-3 sm:px-6 rounded-full border border-[#f4b43e]/20 hover:border-[#f4b43e]/40 transition-colors font-mono text-[8px] sm:text-xs">
          <span>Powered By</span>
          <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Beaver Foundation</span>
        </div>
      </div>
    </footer>
  );
}