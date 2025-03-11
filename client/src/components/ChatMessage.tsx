import { Card } from "@/components/ui/card";
import { shortenAddress } from "@/lib/web3";
import { type Message } from "@shared/schema";
import { format } from "date-fns";

interface ChatMessageProps {
  message: Message;
  isOwn: boolean;
}

export default function ChatMessage({ message, isOwn }: ChatMessageProps) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <Card className={`max-w-[80%] p-3 ${
        isOwn ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' : 'bg-gray-100'
      }`}>
        <div className="text-sm font-medium mb-1">
          {shortenAddress(message.fromAddress)}
        </div>
        <div className="break-words">{message.content}</div>
        <div className="text-xs mt-1 opacity-70">
          {format(message.timestamp, 'HH:mm')}
        </div>
      </Card>
    </div>
  );
}
