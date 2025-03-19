import { Building2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full border-t border-[#2bbd2b]/10 bg-black">
      <div className="container max-w-6xl mx-auto py-4 px-4 flex items-center justify-center">
        <div className="flex items-center gap-2 text-[#2bbd2b] bg-[#2bbd2b]/5 py-2 px-4 rounded-full border border-[#2bbd2b]/20 hover:border-[#2bbd2b]/40 transition-colors">
          <span className="font-['Press_Start_2P'] text-[10px] sm:text-xs">Powered By</span>
          <Building2 className="h-4 w-4" />
          <span className="font-['Press_Start_2P'] text-[10px] sm:text-xs">Beaver Foundation</span>
        </div>
      </div>
    </footer>
  );
}