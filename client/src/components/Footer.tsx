import { Building2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full border-t border-blue-900/10 bg-black">
      <div className="max-w-6xl mx-auto py-6 px-4 flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-blue-400 bg-blue-900/20 py-3 px-6 rounded-full border border-blue-400/20 hover:border-blue-400/40 transition-colors">
          <span>Powered By</span>
          <Building2 className="h-5 w-5" />
          <span>Beaver Foundation</span>
        </div>
      </div>
    </footer>
  );
}