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

  // Fetch reactions for this message
  const { data: reactions = [] } = useQuery<Reaction[]>({
    queryKey: [`/api/messages/${message.id}/reactions`],
    enabled: !!message.id,
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
    try {
      await apiRequest("POST", `/api/messages/${message.id}/reactions`, {
        emoji: emoji.native,
        fromAddress: message.fromAddress,
      });
      await queryClient.invalidateQueries({ 
        queryKey: [`/api/messages/${message.id}/reactions`] 
      });
    } catch (error) {
      console.error("Failed to add reaction:", error);
    }
  };

  if (!message) return null;

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 group`}>
      <Card className={`max-w-[80%] p-3 relative ${
        isOwn 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted'
      }`}>
        <div className="text-sm font-medium mb-1 opacity-90">
          {shortenAddress(message.fromAddress)}
        </div>
        <div className="break-words">{message.content}</div>

        {/* Timestamp and Read Status */}
        <div className="text-xs mt-2 opacity-70 flex items-center gap-1">
          {format(new Date(message.timestamp), 'HH:mm')}
          {isOwn && (
            <span className="ml-1">
              <CheckCheck className="h-3 w-3 inline" />
            </span>
          )}
        </div>

        {/* Reactions */}
        {reactionCounts.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {reactionCounts.map((reaction, index) => (
              <span 
                key={index} 
                className="bg-black/20 rounded px-1.5 py-0.5 text-sm"
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
              className="opacity-0 group-hover:opacity-100 absolute -right-8 top-2 h-6 w-6 p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-opacity"
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 border-none" side="right">
            <Picker 
              data={data} 
              onEmojiSelect={handleEmojiSelect}
              theme="dark"
              emojiSize={20}
              emojiButtonSize={28}
              maxFrequentRows={1}
            />
          </PopoverContent>
        </Popover>
      </Card>
    </div>
  );
}