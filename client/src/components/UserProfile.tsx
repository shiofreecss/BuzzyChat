import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, UpdateUser } from "@shared/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface UserProfileProps {
  address: string;
}

export default function UserProfile({ address }: UserProfileProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");

  const { data: user } = useQuery<User>({
    queryKey: ['user', address],
    queryFn: async () => {
      const res = await fetch(`/api/users/${address}`);
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    enabled: !!address,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updateData: UpdateUser = {
        username: username || null,
        nickname: nickname || null,
      };

      await apiRequest("PATCH", `/api/users/${address}`, updateData);
      queryClient.invalidateQueries({ queryKey: ['user', address] });
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated",
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: (error as Error).message,
      });
    }
  };

  const startEditing = () => {
    if (user) {
      setUsername(user.username || "");
      setNickname(user.nickname || "");
    }
    setIsEditing(true);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Profile Settings
          {!isEditing && (
            <Button onClick={startEditing} variant="outline">
              Edit Profile
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter nickname"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Save Changes</Button>
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Username</Label>
              <p className="text-lg">{user?.username || "Not set"}</p>
            </div>
            <div>
              <Label>Nickname</Label>
              <p className="text-lg">{user?.nickname || "Not set"}</p>
            </div>
            <div>
              <Label>Wallet Address</Label>
              <p className="text-sm font-mono">{address}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
