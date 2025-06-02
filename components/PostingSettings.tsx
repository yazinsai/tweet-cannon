'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PostingConfig, PostingCadence } from '@/lib/types';
import { getPostingConfig, savePostingConfig } from '@/lib/storage';

interface PostingSettingsProps {
  onConfigUpdated?: (config: PostingConfig) => void;
  className?: string;
}

const PostingSettings: React.FC<PostingSettingsProps> = ({
  onConfigUpdated,
  className,
}) => {
  const [config, setConfig] = useState<PostingConfig>({
    enabled: true,
    cadence: 'daily',
    interval: 24,
    randomWindow: 30,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Load current config
  useEffect(() => {
    try {
      const currentConfig = getPostingConfig();
      setConfig(currentConfig);
    } catch (err) {
      setError('Failed to load posting configuration');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSave = async () => {
    setError('');
    setSuccessMessage('');
    setIsSaving(true);

    try {
      // Calculate next post time if enabled
      const updatedConfig: PostingConfig = {
        ...config,
        nextPostTime: config.enabled ? calculateNextPostTime(config) : undefined,
      };

      savePostingConfig(updatedConfig);
      setConfig(updatedConfig);
      setSuccessMessage('Settings saved successfully!');
      onConfigUpdated?.(updatedConfig);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateNextPostTime = (config: PostingConfig): Date => {
    const now = new Date();
    const intervalMs = config.interval * 60 * 60 * 1000; // Convert hours to milliseconds
    const randomMs = Math.random() * config.randomWindow * 60 * 1000; // Convert minutes to milliseconds

    return new Date(now.getTime() + intervalMs + randomMs);
  };

  const handleCadenceChange = (cadence: PostingCadence) => {
    const intervalMap: Record<PostingCadence, number> = {
      hourly: 1,
      daily: 24,
      custom: config.interval,
    };

    setConfig(prev => ({
      ...prev,
      cadence,
      interval: intervalMap[cadence],
    }));
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Posting Settings</span>
          <Badge variant={config.enabled ? 'success' : 'default'}>
            {config.enabled ? '🟢 Enabled' : '⚪ Disabled'}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <h3 className="font-medium text-card-foreground">Auto-posting</h3>
            <p className="text-sm text-muted-foreground">
              Automatically post tweets from your queue
            </p>
          </div>
          <Button
            variant={config.enabled ? 'danger' : 'primary'}
            onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
          >
            {config.enabled ? 'Disable' : 'Enable'}
          </Button>
        </div>

        {/* Cadence Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-card-foreground">
            Posting Frequency
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['hourly', 'daily', 'custom'] as PostingCadence[]).map((cadence) => (
              <Button
                key={cadence}
                size="sm"
                variant={config.cadence === cadence ? 'primary' : 'secondary'}
                onClick={() => handleCadenceChange(cadence)}
                className="capitalize"
              >
                {cadence}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Interval */}
        {config.cadence === 'custom' && (
          <Input
            label="Custom Interval (hours)"
            type="number"
            min="1"
            max="168"
            value={config.interval}
            onChange={(e) => setConfig(prev => ({
              ...prev,
              interval: parseInt(e.target.value) || 1,
            }))}
            helperText="How many hours between posts (1-168)"
          />
        )}

        {/* Random Window */}
        <Input
          label="Random Window (minutes)"
          type="number"
          min="0"
          max="120"
          value={config.randomWindow}
          onChange={(e) => setConfig(prev => ({
            ...prev,
            randomWindow: parseInt(e.target.value) || 0,
          }))}
          helperText="Add randomness to posting times (0-120 minutes)"
        />

        {/* Next Post Preview */}
        {config.enabled && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
              Next Post Preview
            </h4>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Posts will occur every {config.interval} hour{config.interval !== 1 ? 's' : ''}
              {config.randomWindow > 0 && ` (±${config.randomWindow} minutes)`}
            </p>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
          </div>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          loading={isSaving}
          className="w-full"
        >
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
};

export { PostingSettings };
