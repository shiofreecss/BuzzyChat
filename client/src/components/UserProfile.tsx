import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, UpdateUser } from "@shared/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

interface UserProfileProps {
  address: string;
  onBack: () => void;
}

export default function UserProfile({ address, onBack }: UserProfileProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['/api/users', address],
    queryFn: async () => {
      const res = await fetch(`/api/users/${address}`);
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    enabled: !!address,
  });

  useEffect(() => {
    if (user && !isEditing) {
      setUsername(user.username || "");
      setNickname(user.nickname || "");
    }
  }, [user, isEditing]);

  const validateUsername = (value: string) => {
    if (!value) return true;
    if (value.length < 3 || value.length > 20) {
      setUsernameError("Username must be between 3 and 20 characters");
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameError("Username can only contain letters, numbers, and underscores");
      return false;
    }
    setUsernameError(null);
    return true;
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    validateUsername(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (username && !validateUsername(username)) return;

    try {
      setIsSubmitting(true);
      const updateData: UpdateUser = {
        username: username || null,
        nickname: nickname || null,
      };

      await apiRequest("PATCH", `/api/users/${address}`, updateData);
      await queryClient.invalidateQueries({ queryKey: ['/api/users', address] });
      await queryClient.invalidateQueries({ queryKey: ['/api/users'] });

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated",
        duration: 3000,
      });
      setIsEditing(false);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message;
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: errorMessage,
        duration: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = () => {
    if (user) {
      setUsername(user.username || "");
      setNickname(user.nickname || "");
    }
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto bg-black border border-[#f4b43e]">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-[#f4b43e]/10 rounded w-1/4"></div>
            <div className="h-8 bg-[#f4b43e]/10 rounded"></div>
            <div className="h-4 bg-[#f4b43e]/10 rounded w-1/4"></div>
            <div className="h-8 bg-[#f4b43e]/10 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-black border border-[#f4b43e]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onBack}
            className="p-0 hover:bg-transparent text-[#f4b43e] hover:text-[#f4b43e]/80"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <CardTitle className="flex-1 text-center font-mono text-[#f4b43e] text-sm sm:text-base uppercase tracking-wider">
            Profile Settings
          </CardTitle>
          {!isEditing && (
            <Button onClick={startEditing} className="retro-button text-xs">
              Edit Profile
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="font-mono text-xs text-[#f4b43e] uppercase">Username</Label>
              <Input
                value={username}
                onChange={handleUsernameChange}
                placeholder="Enter username"
                disabled={isSubmitting}
                className={`retro-input ${usernameError ? 'border-red-500' : ''}`}
              />
              {usernameError && (
                <p className="text-xs text-red-500 mt-1">{usernameError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs text-[#f4b43e] uppercase">Nickname</Label>
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter nickname"
                disabled={isSubmitting}
                className="retro-input"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting} className="retro-button text-xs">
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={isSubmitting}
                className="retro-button text-xs bg-transparent"
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="font-mono text-xs text-[#f4b43e] uppercase">Username</Label>
              <p className="mt-1 font-mono text-[#f4b43e]/80 text-sm">
                {user?.username || "Not set"}
              </p>
            </div>
            <div>
              <Label className="font-mono text-xs text-[#f4b43e] uppercase">Nickname</Label>
              <p className="mt-1 font-mono text-[#f4b43e]/80 text-sm">
                {user?.nickname || "Not set"}
              </p>
            </div>
            <div>
              <Label className="font-mono text-xs text-[#f4b43e] uppercase">Wallet Address</Label>
              <p className="mt-1 font-mono text-[#f4b43e]/80 text-xs break-all">
                {address}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}