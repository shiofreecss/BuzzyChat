import { Building2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full border-t bg-white">
      <div className="max-w-6xl mx-auto py-6 px-4 flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 py-3 px-6 rounded-full">
          <span>Powered By</span>
          <Building2 className="h-5 w-5" />
          <span>Beaver Foundation</span>
        </div>
      </div>
    </footer>
  );
}