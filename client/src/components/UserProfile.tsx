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
import CountrySelect from "./CountrySelect";

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
  const [country, setCountry] = useState(""); // Added state for country
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setCountry(user.country || ""); // Set country from user data
    }
  }, [user, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const updateData: UpdateUser = {
        username: username || null,
        nickname: nickname || null,
        country: country || null, // Include country in update data
      };

      await apiRequest("PATCH", `/api/users/${address}`, updateData);
      await queryClient.invalidateQueries({ queryKey: ['/api/users', address] });
      await queryClient.invalidateQueries({ queryKey: ['/api/users'] });

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
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = () => {
    if (user) {
      setUsername(user.username || "");
      setNickname(user.nickname || "");
      setCountry(user.country || ""); // Set country from user data
    }
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto bg-black border-[#2bbd2b]">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-[#2bbd2b]/10 rounded w-1/4"></div>
            <div className="h-8 bg-[#2bbd2b]/10 rounded"></div>
            <div className="h-4 bg-[#2bbd2b]/10 rounded w-1/4"></div>
            <div className="h-8 bg-[#2bbd2b]/10 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-black border-[#2bbd2b]">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="p-0 hover:bg-transparent text-[#2bbd2b] hover:text-[#2bbd2b]/80"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <CardTitle className="flex-1 text-center font-['Press_Start_2P'] text-[#2bbd2b] text-lg">Profile Settings</CardTitle>
          {!isEditing && (
            <Button
              onClick={startEditing}
              variant="outline"
              className="retro-button"
            >
              Edit Profile
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#2bbd2b] font-['Press_Start_2P'] text-xs">Username</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                disabled={isSubmitting}
                className="retro-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#2bbd2b] font-['Press_Start_2P'] text-xs">Nickname</Label>
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter nickname"
                disabled={isSubmitting}
                className="retro-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#2bbd2b] font-['Press_Start_2P'] text-xs">Country</Label>
              <CountrySelect
                onSelect={(country) => setCountry(country)}
                selectedCountry={country}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting} className="retro-button">
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={isSubmitting}
                className="retro-button"
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-[#2bbd2b] font-['Press_Start_2P'] text-xs">Username</Label>
              <p className="font-mono text-[#2bbd2b] mt-1">
                {user?.username || "Not set"}
              </p>
            </div>
            <div>
              <Label className="text-[#2bbd2b] font-['Press_Start_2P'] text-xs">Nickname</Label>
              <p className="font-mono text-[#2bbd2b] mt-1">
                {user?.nickname || "Not set"}
              </p>
            </div>
            <div>
              <Label className="text-[#2bbd2b] font-['Press_Start_2P'] text-xs">Country</Label>
              <p className="font-mono text-[#2bbd2b] mt-1">
                {user?.country || "Not set"}
              </p>
            </div>
            <div>
              <Label className="text-[#2bbd2b] font-['Press_Start_2P'] text-xs">Wallet Address</Label>
              <p className="text-sm font-mono text-[#2bbd2b]/80 break-all mt-1">{address}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}