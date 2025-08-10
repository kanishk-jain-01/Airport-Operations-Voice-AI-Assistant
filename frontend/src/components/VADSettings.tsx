import { Settings, Volume2, Activity } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Separator } from './ui/separator';

interface VADSettingsProps {
  silenceThreshold: number;
  onThresholdChange: (threshold: number) => void;
  vadEnabled: boolean;
}

export function VADSettings({ 
  silenceThreshold, 
  onThresholdChange,
  vadEnabled 
}: VADSettingsProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="glass"
          size="icon"
          className="relative"
        >
          <Settings className="h-4 w-4" />
          <span className="sr-only">VAD Settings</span>
          {vadEnabled && (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 glass border-white/10" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Voice Activity Detection</h4>
              <Badge variant={vadEnabled ? "success" : "secondary"} className="text-xs">
                {vadEnabled ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Automatically stops recording when you stop speaking
            </p>
          </div>
          
          <Separator className="bg-white/10" />
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium">
                  Silence Threshold
                </label>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {silenceThreshold}ms
              </span>
            </div>
            
            <Slider
              value={[silenceThreshold]}
              onValueChange={(value) => onThresholdChange(value[0])}
              min={300}
              max={1500}
              step={100}
              className="w-full"
            />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Quick</span>
              <span>Balanced</span>
              <span>Patient</span>
            </div>
          </div>
          
          <div className="rounded-lg bg-primary/5 p-3 border border-primary/10">
            <div className="flex items-start gap-2">
              <Volume2 className="h-4 w-4 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-primary">Tip</p>
                <p className="text-xs text-muted-foreground">
                  Lower values stop recording faster, higher values wait longer for you to continue speaking.
                </p>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}