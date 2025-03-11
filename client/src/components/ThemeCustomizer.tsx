import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ThemeCustomizerProps {
  onThemeChange: (colors: ChatTheme) => void;
  currentTheme: ChatTheme;
}

export interface ChatTheme {
  primary: string;
  secondary: string;
  background: string;
}

export default function ThemeCustomizer({ onThemeChange, currentTheme }: ThemeCustomizerProps) {
  const [theme, setTheme] = useState<ChatTheme>(currentTheme);
  const [activeColor, setActiveColor] = useState<keyof ChatTheme>("primary");

  const handleColorChange = (color: string) => {
    const newTheme = { ...theme, [activeColor]: color };
    setTheme(newTheme);
    onThemeChange(newTheme);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Customize Chat Theme</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Colors</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={activeColor === "primary" ? "default" : "outline"}
                onClick={() => setActiveColor("primary")}
                className="flex-1"
              >
                Primary
              </Button>
              <Button
                variant={activeColor === "secondary" ? "default" : "outline"}
                onClick={() => setActiveColor("secondary")}
                className="flex-1"
              >
                Secondary
              </Button>
              <Button
                variant={activeColor === "background" ? "default" : "outline"}
                onClick={() => setActiveColor("background")}
                className="flex-1"
              >
                Background
              </Button>
            </div>
          </div>
          <Card>
            <CardContent className="pt-6">
              <HexColorPicker
                color={theme[activeColor]}
                onChange={handleColorChange}
              />
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <div
              className="w-8 h-8 rounded border"
              style={{ backgroundColor: theme.primary }}
            />
            <div
              className="w-8 h-8 rounded border"
              style={{ backgroundColor: theme.secondary }}
            />
            <div
              className="w-8 h-8 rounded border"
              style={{ backgroundColor: theme.background }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
