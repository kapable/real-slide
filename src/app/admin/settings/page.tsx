"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";
import { Save, RotateCcw, Check, Settings } from "lucide-react";

interface Settings {
  maxParticipants: number;
  enableWordcloud: boolean;
  enableComments: boolean;
  enableHandsUp: boolean;
}

const defaultSettings: Settings = {
  maxParticipants: 100,
  enableWordcloud: true,
  enableComments: true,
  enableHandsUp: true,
};

export default function SettingsPage() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin-settings");
      if (saved) {
        return { ...defaultSettings, ...JSON.parse(saved) };
      }
    }
    return defaultSettings;
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem("admin-settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    localStorage.removeItem("admin-settings");
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.admin.settings.title}</h1>
        <p className="text-muted-foreground">{t.admin.settings.description}</p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.admin.settings.generalSettings}</CardTitle>
          <CardDescription>{t.admin.settings.defaultSession}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="maxParticipants">{t.admin.settings.maxParticipants}</Label>
              <p className="text-xs text-muted-foreground">
                Maximum number of participants allowed per session
              </p>
            </div>
            <Input
              id="maxParticipants"
              type="number"
              min={1}
              max={1000}
              value={settings.maxParticipants}
              onChange={(e) => updateSetting("maxParticipants", parseInt(e.target.value) || 100)}
              className="w-24"
            />
          </div>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.admin.settings.featureToggles}</CardTitle>
          <CardDescription>Enable or disable features for all sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Wordcloud */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableWordcloud">{t.admin.settings.enableWordcloud}</Label>
              <p className="text-xs text-muted-foreground">
                {t.admin.settings.enableWordcloudDesc}
              </p>
            </div>
            <Switch
              id="enableWordcloud"
              checked={settings.enableWordcloud}
              onCheckedChange={(checked) => updateSetting("enableWordcloud", checked)}
            />
          </div>

          {/* Comments */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableComments">{t.admin.settings.enableComments}</Label>
              <p className="text-xs text-muted-foreground">
                {t.admin.settings.enableCommentsDesc}
              </p>
            </div>
            <Switch
              id="enableComments"
              checked={settings.enableComments}
              onCheckedChange={(checked) => updateSetting("enableComments", checked)}
            />
          </div>

          {/* Hands Up */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableHandsUp">{t.admin.settings.enableHandsUp}</Label>
              <p className="text-xs text-muted-foreground">
                {t.admin.settings.enableHandsUpDesc}
              </p>
            </div>
            <Switch
              id="enableHandsUp"
              checked={settings.enableHandsUp}
              onCheckedChange={(checked) => updateSetting("enableHandsUp", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSave} className="gap-2">
          {saved ? (
            <>
              <Check className="h-4 w-4" />
              {t.admin.settings.saved}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {t.admin.settings.save}
            </>
          )}
        </Button>
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          {t.admin.settings.reset}
        </Button>
      </div>
    </div>
  );
}
