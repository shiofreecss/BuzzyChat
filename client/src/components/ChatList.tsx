import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { shortenAddress } from "@/lib/web3";

interface ChatListProps {
  currentAddress: string;
  onSelectUser: (user: User) => void;
}

export default function ChatList({ currentAddress, onSelectUser }: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const filteredUsers = users.filter(user => 
    user.address !== currentAddress &&
    (user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Card className="w-80 h-[600px] flex flex-col">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredUsers.map((user) => (
            <Button
              key={user.id}
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={() => onSelectUser(user)}
            >
              <MessageSquare className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">
                  {user.username || shortenAddress(user.address)}
                </div>
                {user.username && (
                  <div className="text-xs text-muted-foreground">
                    {shortenAddress(user.address)}
                  </div>
                )}
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
