import { Card } from "@/components/ui/card";
import { shortenAddress } from "@/lib/web3";
import { type Message, type Reaction } from "@shared/schema";
import { format } from "date-fns";
import { PlusCircle, Check, CheckCheck } from "lucide-react";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessageProps {
  message: Message;
  isOwn: boolean;
}

interface ReactionCount {
  emoji: string;
  count: number;
}

export default function ChatMessage({ message, isOwn }: ChatMessageProps) {
  const [showPicker, setShowPicker] = useState(false);
  const queryClient = useQueryClient();
  const { sendMessage } = useWebSocket();

  // Fetch reactions for this message with shorter stale time for faster updates
  const { data: reactions = [] } = useQuery<Reaction[]>({
    queryKey: [`/api/messages/${message.id}/reactions`],
    enabled: !!message.id,
    staleTime: 1000, // Short stale time to refresh quickly
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Group reactions by emoji and count them
  const reactionCounts = reactions.reduce((acc: ReactionCount[], reaction) => {
    const existing = acc.find(r => r.emoji === reaction.emoji);
    if (existing) {
      existing.count++;
      return acc;
    }
    return [...acc, { emoji: reaction.emoji, count: 1 }];
  }, []);

  const handleEmojiSelect = async (emoji: any) => {
    setShowPicker(false);
    
    // Send reaction through WebSocket
    sendMessage({
      type: 'reaction',
      messageId: message.id,
      emoji: emoji.native,
      fromAddress: message.fromAddress
    });
  };

  // Check if message is long or contains long words
  const isLongMessage = message.content.length > 100 || 
    message.content.split(' ').some(word => word.length > 30);

  if (!message) return null;

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 md:mb-4 group`}>
      <Card className={`max-w-[90%] md:max-w-[85%] p-2 md:p-3 relative ${
        isOwn 
          ? 'bg-[#f4b43e]/10 border-[#f4b43e]/30 shadow-lg shadow-[#f4b43e]/10' 
          : 'bg-[#f4b43e]/5 border-[#f4b43e]/20'
      }`}>
        <div className="text-xs md:text-sm font-mono mb-1 text-[#f4b43e] text-glow">
          {shortenAddress(message.fromAddress)}
        </div>
        
        {isLongMessage ? (
          <ScrollArea className="max-h-40 md:max-h-60 max-w-full pr-2 md:pr-4">
            <div className="text-sm md:text-base text-[#f4b43e] text-glow whitespace-pre-wrap break-words">
              {message.content}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-sm md:text-base text-[#f4b43e] text-glow whitespace-pre-wrap break-words">
            {message.content}
          </div>
        )}

        {/* Timestamp and Read Status */}
        <div className="text-[10px] md:text-xs mt-1 md:mt-2 text-[#f4b43e]/70 flex items-center gap-1 font-mono">
          {format(new Date(message.timestamp), 'HH:mm')}
          {isOwn && (
            <span className="ml-1">
              <CheckCheck className="h-2 w-2 md:h-3 md:w-3 inline" />
            </span>
          )}
        </div>

        {/* Reactions */}
        {reactionCounts.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 md:mt-2">
            {reactionCounts.map((reaction, index) => (
              <span 
                key={index} 
                className="bg-[#f4b43e]/5 border border-[#f4b43e]/20 rounded px-1 md:px-1.5 py-0.5 text-xs md:text-sm text-[#f4b43e]"
              >
                {reaction.emoji} {reaction.count}
              </span>
            ))}
          </div>
        )}

        {/* Quick Reaction Button */}
        <Popover open={showPicker} onOpenChange={setShowPicker}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="opacity-0 group-hover:opacity-100 absolute -right-6 md:-right-8 top-1 md:top-2 h-5 w-5 md:h-6 md:w-6 p-1 text-[#f4b43e] hover:text-[#f4b43e] hover:bg-[#f4b43e]/10 transition-all"
            >
              <PlusCircle className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 border-none shadow-lg shadow-[#f4b43e]/20">
            <Picker 
              data={data} 
              onEmojiSelect={handleEmojiSelect}
              theme="dark"
              emojiSize={18}
              emojiButtonSize={28}
              maxFrequentRows={1}
            />
          </PopoverContent>
        </Popover>
      </Card>
    </div>
  );
}