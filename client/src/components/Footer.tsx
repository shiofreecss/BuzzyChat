import { Building2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full border-t border-[#2bbd2b]/10 bg-black">
      <div className="max-w-6xl mx-auto py-4 sm:py-6 px-4 flex items-center justify-center">
        <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-[#2bbd2b] bg-[#2bbd2b]/5 py-2 sm:py-3 px-3 sm:px-6 rounded-full border border-[#2bbd2b]/20 hover:border-[#2bbd2b]/40 transition-colors font-['Press_Start_2P'] text-[8px] sm:text-xs">
          <span>Powered By</span>
          <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Beaver Foundation</span>
        </div>
      </div>
    </footer>
  );
}