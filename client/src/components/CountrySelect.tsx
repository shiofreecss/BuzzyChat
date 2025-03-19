import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const countries = [
  { label: "United States", value: "US" },
  { label: "United Kingdom", value: "GB" },
  { label: "Canada", value: "CA" },
  { label: "Australia", value: "AU" },
  { label: "Germany", value: "DE" },
  { label: "France", value: "FR" },
  { label: "Japan", value: "JP" },
  { label: "South Korea", value: "KR" },
  { label: "China", value: "CN" },
  { label: "India", value: "IN" },
  { label: "Brazil", value: "BR" },
  { label: "Mexico", value: "MX" },
  { label: "Spain", value: "ES" },
  { label: "Italy", value: "IT" },
  { label: "Russia", value: "RU" },
  { label: "Vietnam", value: "VN" },
  { label: "Thailand", value: "TH" },
  { label: "Singapore", value: "SG" },
  { label: "Malaysia", value: "MY" },
  { label: "Indonesia", value: "ID" },
  { label: "Philippines", value: "PH" },
  { label: "Netherlands", value: "NL" },
  { label: "Sweden", value: "SE" },
  { label: "Norway", value: "NO" },
  { label: "Denmark", value: "DK" },
  { label: "Finland", value: "FI" },
  { label: "Poland", value: "PL" },
  { label: "Ukraine", value: "UA" },
  { label: "Turkey", value: "TR" },
  { label: "Saudi Arabia", value: "SA" },
  { label: "UAE", value: "AE" },
  { label: "Egypt", value: "EG" },
  { label: "South Africa", value: "ZA" },
  { label: "Nigeria", value: "NG" },
  { label: "Kenya", value: "KE" },
  { label: "Argentina", value: "AR" },
  { label: "Chile", value: "CL" },
  { label: "Colombia", value: "CO" },
  { label: "Peru", value: "PE" },
  { label: "New Zealand", value: "NZ" },
].sort((a, b) => a.label.localeCompare(b.label));

interface CountrySelectProps {
  onSelect: (country: string) => void;
  selectedCountry?: string;
}

export default function CountrySelect({ onSelect, selectedCountry }: CountrySelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between retro-button"
        >
          {selectedCountry
            ? countries.find((country) => country.value === selectedCountry)?.label
            : "Select country..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-black border border-[#2bbd2b]">
        <Command>
          <CommandInput
            placeholder="Search country..."
            className="h-9 retro-input"
          />
          <CommandEmpty className="py-2 text-center text-[#2bbd2b] font-['Press_Start_2P'] text-xs">
            No country found.
          </CommandEmpty>
          <CommandGroup className="max-h-60 overflow-auto">
            {countries.map((country) => (
              <CommandItem
                key={country.value}
                value={country.value}
                onSelect={(currentValue) => {
                  onSelect(currentValue);
                  setOpen(false);
                }}
                className="cursor-pointer text-[#2bbd2b] hover:bg-[#2bbd2b]/10 font-['Press_Start_2P'] text-xs"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedCountry === country.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {country.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}