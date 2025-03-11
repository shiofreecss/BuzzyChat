import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageSquare, UserPlus, UserCheck } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const [viewMode, setViewMode] = useState<"all" | "friends">("friends");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: friends = [] } = useQuery<User[]>({
    queryKey: [`/api/friends/${currentAddress}`],
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
      console.log('Accepting friend request:', requestId);
      await apiRequest('POST', `/api/friends/accept/${requestId}`);
      console.log('Friend request accepted, refetching data...');

      // Force immediate refetch of both queries
      await Promise.all([
        queryClient.refetchQueries({ queryKey: [`/api/friends/${currentAddress}`] }),
        queryClient.refetchQueries({ queryKey: [`/api/friends/requests/${currentAddress}`] })
      ]);

      console.log('Queries refetched');
      toast({
        title: "Friend Request Accepted",
        description: "You are now friends with this user",
      });

      // Switch to friends view
      setViewMode("friends");
    } catch (error) {
      console.error('Error accepting friend request:', error);
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
    <Card className="w-80 h-[600px] flex flex-col bg-gray-900">
      <div className="p-4 border-b border-gray-800">
        <div className="flex justify-between mb-3">
          <Button 
            variant={viewMode === "friends" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("friends")}
            className="w-1/2 bg-purple-600 hover:bg-purple-700"
          >
            Friends ({friends.length})
          </Button>
          <Button 
            variant={viewMode === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("all")}
            className="w-1/2"
          >
            All Users
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={viewMode === "friends" ? "Search friends..." : "Search users..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-gray-800 border-gray-700"
          />
        </div>
      </div>

      {friendRequests.length > 0 && (
        <div className="p-4 border-b border-gray-800 bg-gray-800/50">
          <h3 className="text-sm font-medium mb-2 text-gray-200">Friend Requests ({friendRequests.length})</h3>
          {friendRequests.map((request) => (
            <div key={request.id} className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">{shortenAddress(request.requestorAddress)}</span>
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
        {viewMode === "friends" ? (
          <div className="p-4 space-y-2">
            {friends.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No friends yet</p>
                <p className="text-xs mt-2">Switch to "All Users" to add friends</p>
              </div>
            ) : (
              friends
                .filter(friend => 
                  friend.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  friend.address.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      className="flex-1 justify-start gap-2"
                      onClick={() => onSelectUser(friend)}
                    >
                      <MessageSquare className="h-4 w-4" />
                      <div className="text-left">
                        <div className="font-medium">
                          {friend.username || shortenAddress(friend.address)}
                        </div>
                        {friend.username && (
                          <div className="text-xs text-gray-400">
                            {shortenAddress(friend.address)}
                          </div>
                        )}
                      </div>
                    </Button>
                  </div>
                ))
            )}
          </div>
        ) : (
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
                      <div className="text-xs text-gray-400">
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
                    className="ml-2 text-purple-400 hover:text-purple-300"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}