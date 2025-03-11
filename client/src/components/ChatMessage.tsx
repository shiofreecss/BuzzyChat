import { Card } from "@/components/ui/card";
import { shortenAddress } from "@/lib/web3";
import { type Message } from "@shared/schema";
import { format } from "date-fns";

interface ChatMessageProps {
  message: Message;
  isOwn: boolean;
}

export default function ChatMessage({ message, isOwn }: ChatMessageProps) {
  if (!message) return null;

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <Card className={`max-w-[80%] p-3 ${
        isOwn 
          ? 'bg-purple-600 text-white' 
          : 'bg-gray-800 text-gray-100'
      }`}>
        <div className="text-sm font-medium mb-1 opacity-90">
          {shortenAddress(message.fromAddress)}
        </div>
        <div className="break-words">{message.content}</div>
        <div className="text-xs mt-1 opacity-70">
          {format(new Date(message.timestamp), 'HH:mm')}
        </div>
      </Card>
    </div>
  );
}