import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageSquare, UserPlus, UserCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { User, Friend } from "@shared/schema";
import { shortenAddress } from "@/lib/web3";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ChatListProps {
  currentAddress: string;
  onSelectUser: (user: User) => void;
}

export default function ChatList({ currentAddress, onSelectUser }: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: friends = [] } = useQuery<User[]>({
    queryKey: ['/api/friends', currentAddress],
  });

  const { data: friendRequests = [] } = useQuery<Friend[]>({
    queryKey: [`/api/friends/requests/${currentAddress}`],
  });

  const sendFriendRequest = async (recipientAddress: string) => {
    try {
      await apiRequest('POST', '/api/friends/request', {
        requestorAddress: currentAddress,
        recipientAddress,
        status: 'pending'
      });
      toast({
        title: "Friend Request Sent",
        description: "Your friend request has been sent successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send friend request",
      });
    }
  };

  const acceptFriendRequest = async (requestId: number) => {
    try {
      await apiRequest('POST', `/api/friends/accept/${requestId}`);
      toast({
        title: "Friend Request Accepted",
        description: "You are now friends with this user",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to accept friend request",
      });
    }
  };

  const isFriend = (address: string) => {
    return friends.some(friend => friend.address === address);
  };

  const hasPendingRequest = (address: string) => {
    return friendRequests.some(request => request.requestorAddress === address);
  };

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

      {friendRequests.length > 0 && (
        <div className="p-4 border-b bg-muted/50">
          <h3 className="text-sm font-medium mb-2">Friend Requests</h3>
          {friendRequests.map((request) => (
            <div key={request.id} className="flex items-center justify-between mb-2">
              <span className="text-sm">{shortenAddress(request.requestorAddress)}</span>
              <Button 
                size="sm"
                onClick={() => acceptFriendRequest(request.id)}
                className="bg-green-600 hover:bg-green-700"
              >
                <UserCheck className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between">
              <Button
                variant="ghost"
                className="flex-1 justify-start gap-2"
                onClick={() => isFriend(user.address) && onSelectUser(user)}
                disabled={!isFriend(user.address)}
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
              {!isFriend(user.address) && !hasPendingRequest(user.address) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => sendFriendRequest(user.address)}
                  className="ml-2"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}