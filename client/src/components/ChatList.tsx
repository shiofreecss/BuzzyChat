import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageSquare, UserPlus, UserCheck, Users, Globe } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User, Friend, Message } from "@shared/schema";
import { shortenAddress } from "@/lib/web3";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import NationSelect from "./NationSelect";
import { getUserNation } from "@/pusher-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChatListProps {
  currentAddress: string;
  onSelectUser: (user: User | null) => void;
  onPublicChat: () => void;
  onNationChat: (nationCode: string) => void;
  onGlobalChat: () => void;
  selectedUser?: User | null;
  selectedNation?: string;
  isGlobalChat?: boolean;
}

export default function ChatList({ 
  currentAddress, 
  onSelectUser, 
  onPublicChat, 
  onNationChat,
  onGlobalChat,
  selectedUser, 
  selectedNation,
  isGlobalChat
}: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "nations">("users");
  const [viewMode, setViewMode] = useState<"all" | "friends">("friends");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's nation based on IP
  const { data: userNation } = useQuery({
    queryKey: ['/api/user/nation'],
    queryFn: async () => {
      try {
        return await getUserNation();
      } catch (error) {
        console.error('Error fetching user nation:', error);
        return null;
      }
    }
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: friends = [] } = useQuery<User[]>({
    queryKey: [`/api/friends/${currentAddress}`],
  });

  const { data: friendRequests = [] } = useQuery<Friend[]>({
    queryKey: [`/api/friends/requests/${currentAddress}`],
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['/api/messages'],
  });

  const getUnreadCount = (friendAddress: string) => {
    return messages.filter(msg => 
      msg.fromAddress === friendAddress && 
      msg.toAddress === currentAddress && 
      !msg.read
    ).length;
  };

  const isFriend = (address: string) => {
    return friends.some(friend => friend.address === address);
  };

  const hasPendingRequest = (address: string) => {
    return friendRequests.some(request => request.requestorAddress === address);
  };

  // Filter out friends from All Users list
  const filteredUsers = users.filter(user =>
    user.address !== currentAddress &&
    !isFriend(user.address) &&
    (user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sendFriendRequest = async (recipientAddress: string) => {
    try {
      await apiRequest('POST', '/api/friends/request', {
        requestorAddress: currentAddress,
        recipientAddress,
        status: 'pending'
      });

      // Refetch friend requests after sending
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [`/api/friends/requests/${currentAddress}`] }),
        queryClient.invalidateQueries({ queryKey: ['/api/users'] })
      ]);

      toast({
        title: "Friend Request Sent",
        description: "Your friend request has been sent successfully",
        duration: 3000
      });
    } catch (error) {
      console.error("Failed to send friend request:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send friend request",
        duration: 3000
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

  return (
    <Card className="h-full flex flex-col bg-black border border-[#f4b43e]">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "users" | "nations")}>
        <div className="p-4 border-b border-[#f4b43e]/30">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="users" className="text-xs">Users & Friends</TabsTrigger>
            <TabsTrigger value="nations" className="text-xs">Nations</TabsTrigger>
          </TabsList>
          
          {activeTab === "users" && (
            <>
              <div className="flex justify-between mb-3">
                <Button
                  variant={viewMode === "friends" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("friends")}
                  className={`w-1/2 retro-button text-xs ${viewMode === "friends" ? 'bg-[#f4b43e] text-black' : ''}`}
                >
                  Friends ({friends.length})
                </Button>
                <Button
                  variant={viewMode === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("all")}
                  className={`w-1/2 retro-button text-xs ${viewMode === "all" ? 'bg-[#f4b43e] text-black' : ''}`}
                >
                  All Users
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-[#f4b43e]/50" />
                <Input
                  placeholder={viewMode === "friends" ? "Search friends..." : "Search users..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 retro-input text-xs h-8"
                />
              </div>
            </>
          )}

          {activeTab === "nations" && (
            <NationSelect 
              currentUserAddress={currentAddress}
              selectedNation={selectedNation}
              onSelectNation={onNationChat}
              onGlobalChat={onGlobalChat}
            />
          )}
        </div>

        <TabsContent value="users" className="flex-1 flex flex-col m-0 p-0">
          <div className="px-4 pt-2">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className={`flex-1 items-center gap-2 retro-button text-xs ${!selectedUser && !selectedNation && !isGlobalChat ? 'bg-[#f4b43e] text-black' : ''}`}
                onClick={onPublicChat}
              >
                <Users className="h-4 w-4" />
                Public Chat
              </Button>
              <Button
                variant="ghost"
                className={`flex-1 items-center gap-2 retro-button text-xs ${isGlobalChat ? 'bg-[#f4b43e] text-black' : ''}`}
                onClick={onGlobalChat}
              >
                <Globe className="h-4 w-4" />
                Global
              </Button>
            </div>
          </div>

          {friendRequests.length > 0 && (
            <div className="p-4 border-b border-[#f4b43e]/30 bg-[#f4b43e]/5">
              <h3 className="text-xs font-mono mb-2 text-[#f4b43e]">
                Friend Requests ({friendRequests.length})
              </h3>
              {friendRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-[#f4b43e]/80">
                    {shortenAddress(request.requestorAddress)}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => acceptFriendRequest(request.id)}
                    className="retro-button text-xs h-7"
                  >
                    <UserCheck className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {viewMode === "friends" ? (
                friends.length === 0 ? (
                  <div className="text-center py-8 text-[#f4b43e]/70 font-mono text-xs">
                    <p>No friends yet</p>
                    <p className="text-xs mt-2">Switch to "All Users" to add friends</p>
                  </div>
                ) : (
                  friends
                    .filter(friend =>
                      friend.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      friend.address.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((friend) => {
                      const unreadCount = getUnreadCount(friend.address);
                      return (
                        <div key={friend.id} className="flex items-center justify-between">
                          <Button
                            variant="ghost"
                            className={`flex-1 justify-start gap-2 retro-button text-xs ${
                              selectedUser?.id === friend.id ? 'bg-[#f4b43e] text-black' : ''
                            }`}
                            onClick={() => onSelectUser(friend)}
                          >
                            <div className="relative">
                              <MessageSquare className="h-4 w-4" />
                              <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                                friend.isOnline ? 'bg-green-500' : 'bg-gray-500'
                              }`} />
                            </div>
                            <div className="text-left flex-1">
                              <div className="font-mono text-xs flex items-center justify-between">
                                <span>{friend.username || shortenAddress(friend.address)}</span>
                                {unreadCount > 0 && (
                                  <Badge variant="secondary" className="ml-2">
                                    {unreadCount}
                                  </Badge>
                                )}
                              </div>
                              {friend.username && (
                                <div className="text-[10px] font-mono opacity-70">
                                  {shortenAddress(friend.address)}
                                </div>
                              )}
                            </div>
                          </Button>
                        </div>
                      );
                    })
                )
              ) : (
                filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      className="flex-1 justify-start gap-2 retro-button text-xs"
                      disabled
                    >
                      <div className="relative">
                        <MessageSquare className="h-4 w-4" />
                        <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                          user.isOnline ? 'bg-green-500' : 'bg-gray-500'
                        }`} />
                      </div>
                      <div className="text-left">
                        <div className="font-mono text-xs">
                          {user.username || shortenAddress(user.address)}
                        </div>
                        {user.username && (
                          <div className="text-[10px] font-mono opacity-70">
                            {shortenAddress(user.address)}
                          </div>
                        )}
                      </div>
                    </Button>
                    {!hasPendingRequest(user.address) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => sendFriendRequest(user.address)}
                        className="ml-2 retro-button h-7 w-7"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="nations" className="flex-1 m-0 p-0">
          <ScrollArea className="flex-1">
            <div className="p-4">
              {userNation && userNation.nation && (
                <div className="mb-4 p-3 bg-[#f4b43e]/10 rounded-md border border-[#f4b43e]/20">
                  <h3 className="text-sm font-semibold text-[#f4b43e]">Your Nation</h3>
                  <p className="text-xs mt-1">{userNation.country} ({userNation.countryCode})</p>
                  {userNation.nation && (
                    <Button 
                      onClick={() => onNationChat(userNation.nation.code)}
                      variant="outline"
                      className="mt-2 w-full text-xs"
                    >
                      Join {userNation.nation.displayName} Chat
                    </Button>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-[#f4b43e] mb-2">Global Channels</h3>
                <Button
                  variant="ghost"
                  className={`w-full justify-start retro-button text-xs ${isGlobalChat ? 'bg-[#f4b43e] text-black' : ''}`}
                  onClick={onGlobalChat}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Global Chat
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start retro-button text-xs ${!selectedUser && !selectedNation && !isGlobalChat ? 'bg-[#f4b43e] text-black' : ''}`}
                  onClick={onPublicChat}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Public Chat
                </Button>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </Card>
  );
}