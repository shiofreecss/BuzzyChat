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
import { TbWorld } from "react-icons/tb";
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
    return <div className="text-center p-4">Loading nations...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 p-4">Error loading nations</div>;
  }

  return (
    <div className="flex flex-col space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Select Chat Room</h3>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2"
          onClick={onGlobalChat}
        >
          <TbWorld className="h-5 w-5" />
          <span>Global</span>
        </Button>
      </div>
      
      <Select
        value={selectedNation}
        onValueChange={handleNationChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select your nation" />
        </SelectTrigger>
        <SelectContent>
          {nations?.map((nation) => (
            <SelectItem key={nation.code} value={nation.code}>
              {nation.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 