import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageSquare, UserPlus, UserCheck, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User, Friend } from "@shared/schema";
import { shortenAddress } from "@/lib/web3";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ChatListProps {
  currentAddress: string;
  onSelectUser: (user: User | null) => void;
  onPublicChat: () => void;
  selectedUser?: User | null;
}

export default function ChatList({ currentAddress, onSelectUser, onPublicChat, selectedUser }: ChatListProps) {
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
      await apiRequest('POST', `/api/friends/accept/${requestId}`);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: [`/api/friends/${currentAddress}`] }),
        queryClient.refetchQueries({ queryKey: [`/api/friends/requests/${currentAddress}`] })
      ]);
      toast({
        title: "Friend Request Accepted",
        description: "You are now friends with this user",
      });
      setViewMode("friends");
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
    <Card className="w-full md:w-80 h-[calc(100vh-8rem)] sm:h-[600px] flex flex-col bg-black border border-[#F0B90B]">
      <div className="p-4 border-b border-[#F0B90B]/20">
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("friends")}
            className={`flex-1 h-8 retro-button text-xs ${viewMode === "friends" ? 'bg-[#F0B90B]/10' : ''}`}
          >
            Friends ({friends.length})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("all")}
            className={`flex-1 h-8 retro-button text-xs ${viewMode === "all" ? 'bg-[#F0B90B]/10' : ''}`}
          >
            All Users
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-[#F0B90B]/50" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 retro-input text-xs h-8 bg-[#F0B90B]/5"
          />
        </div>
      </div>

      <Button
        variant="ghost"
        className={`mx-4 mt-2 flex items-center gap-2 retro-button text-xs ${!selectedUser ? 'bg-[#F0B90B]/10' : ''}`}
        onClick={onPublicChat}
      >
        <Users className="h-4 w-4" />
        Public Chat
      </Button>

      {friendRequests.length > 0 && (
        <div className="mx-4 mt-2 p-2 rounded border border-[#F0B90B]/20 bg-[#F0B90B]/5">
          <h3 className="text-xs font-['Press_Start_2P'] mb-2 text-[#F0B90B]">
            Requests ({friendRequests.length})
          </h3>
          <div className="space-y-1">
            {friendRequests.map((request) => (
              <div key={request.id} 
                className="flex items-center justify-between p-2 rounded hover:bg-[#F0B90B]/10 transition-colors"
              >
                <span className="text-xs font-mono text-[#F0B90B]">
                  {shortenAddress(request.requestorAddress)}
                </span>
                <Button
                  size="sm"
                  onClick={() => acceptFriendRequest(request.id)}
                  className="h-6 px-2 retro-button text-xs"
                >
                  <UserCheck className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-1 py-2">
          {viewMode === "friends" ? (
            friends.length === 0 ? (
              <div className="text-center py-8 text-[#F0B90B]/70 font-['Press_Start_2P'] text-xs">
                <p>No friends yet</p>
                <p className="mt-2 text-[10px]">Switch to "All Users" to add friends</p>
              </div>
            ) : (
              friends
                .filter(friend =>
                  friend.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  friend.address.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((friend) => (
                  <div 
                    key={friend.id} 
                    className={`group rounded transition-colors ${
                      selectedUser?.id === friend.id ? 'bg-[#F0B90B]/10' : 'hover:bg-[#F0B90B]/5'
                    }`}
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 p-2 h-auto retro-button text-xs"
                      onClick={() => onSelectUser(friend)}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      <div className="text-left truncate">
                        <div className="font-['Press_Start_2P'] text-xs truncate">
                          {friend.username || shortenAddress(friend.address)}
                        </div>
                        {friend.username && (
                          <div className="text-[10px] font-mono opacity-70 truncate">
                            {shortenAddress(friend.address)}
                          </div>
                        )}
                      </div>
                    </Button>
                  </div>
                ))
            )
          ) : (
            users
              .filter(user =>
                user.address !== currentAddress &&
                (user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  user.address.toLowerCase().includes(searchQuery.toLowerCase()))
              )
              .map((user) => (
                <div 
                  key={user.id} 
                  className={`group rounded flex items-center transition-colors ${
                    selectedUser?.id === user.id ? 'bg-[#F0B90B]/10' : 'hover:bg-[#F0B90B]/5'
                  }`}
                >
                  <Button
                    variant="ghost"
                    className="flex-1 justify-start gap-2 p-2 h-auto retro-button text-xs"
                    onClick={() => isFriend(user.address) && onSelectUser(user)}
                    disabled={!isFriend(user.address)}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <div className="text-left truncate">
                      <div className="font-['Press_Start_2P'] text-xs truncate">
                        {user.username || shortenAddress(user.address)}
                      </div>
                      {user.username && (
                        <div className="text-[10px] font-mono opacity-70 truncate">
                          {shortenAddress(user.address)}
                        </div>
                      )}
                    </div>
                  </Button>
                  {!isFriend(user.address) && !hasPendingRequest(user.address) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => sendFriendRequest(user.address)}
                      className="mr-2 h-6 w-6 retro-button"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}