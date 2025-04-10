import React, { useEffect, useState } from 'react';
import { getNations, updateUserNation } from '@/pusher-client';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TbWorld, TbPlanet, TbMars } from "react-icons/tb";
import { GiRingedPlanet } from "react-icons/gi";
import { useQuery } from '@tanstack/react-query';

export interface Nation {
  id: number;
  name: string;
  code: string;
  displayName: string;
  active: boolean;
}

interface NationSelectProps {
  currentUserAddress?: string;
  selectedNation?: string;
  onSelectNation: (nationCode: string) => void;
  onGlobalChat: () => void;
}

// Helper to get the appropriate planet icon for each nation
const getPlanetIcon = (nationCode: string) => {
  switch (nationCode) {
    case 'EARTH':
      return <TbPlanet className="h-4 w-4 text-blue-500" />;
    case 'MARS':
      return <TbMars className="h-4 w-4 text-red-500" />;
    case 'JUPITER':
      return <TbPlanet className="h-4 w-4 text-orange-400" />;
    case 'SATURN':
      return <GiRingedPlanet className="h-4 w-4 text-yellow-400" />;
    case 'GLOBAL':
      return <TbWorld className="h-4 w-4 text-green-500" />;
    default:
      return <TbPlanet className="h-4 w-4" />;
  }
};

export default function NationSelect({
  currentUserAddress,
  selectedNation,
  onSelectNation,
  onGlobalChat
}: NationSelectProps) {
  // Fetch the list of nations
  const { data: nations, isLoading, error } = useQuery({
    queryKey: ['/api/nations'],
    queryFn: async () => {
      try {
        const response = await getNations();
        return response as Nation[];
      } catch (error) {
        console.error('Error fetching nations:', error);
        throw error;
      }
    }
  });

  // Handle nation selection change
  const handleNationChange = async (nationCode: string) => {
    if (currentUserAddress) {
      try {
        await updateUserNation(currentUserAddress, nationCode);
      } catch (error) {
        console.error('Error updating user nation:', error);
      }
    }
    onSelectNation(nationCode);
  };

  if (isLoading) {
    return <div className="text-center p-4">Loading planets...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 p-4">Error loading planets</div>;
  }

  return (
    <div className="flex flex-col space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Select Planet Chat</h3>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2"
          onClick={onGlobalChat}
        >
          <TbWorld className="h-5 w-5 text-green-500" />
          <span>Global</span>
        </Button>
      </div>
      
      <Select
        value={selectedNation}
        onValueChange={handleNationChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select your planet" />
        </SelectTrigger>
        <SelectContent>
          {nations?.map((nation) => (
            <SelectItem key={nation.code} value={nation.code}>
              <div className="flex items-center gap-2">
                {getPlanetIcon(nation.code)}
                <span>{nation.displayName}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 