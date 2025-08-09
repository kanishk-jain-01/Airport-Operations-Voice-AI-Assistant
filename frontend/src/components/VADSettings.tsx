import { Settings } from 'lucide-react';
import { useState } from 'react';

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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
        title="VAD Settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-xl z-10 min-w-[280px]">
          <h3 className="text-sm font-semibold mb-3">VAD Settings</h3>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Status
              </label>
              <div className="text-sm">
                {vadEnabled ? (
                  <span className="text-green-400">Enabled</span>
                ) : (
                  <span className="text-slate-500">Disabled</span>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Silence Threshold: {silenceThreshold}ms
              </label>
              <input
                type="range"
                min="300"
                max="1500"
                step="100"
                value={silenceThreshold}
                onChange={(e) => onThresholdChange(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>300ms</span>
                <span>1500ms</span>
              </div>
            </div>

            <div className="text-xs text-slate-400 pt-2 border-t border-slate-700">
              VAD detects when you stop speaking and automatically stops recording after the silence threshold.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}