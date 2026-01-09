/**
 * FBT Backfill Card Component
 *
 * Card component for managing FBT backfill process.
 */
import { useState } from 'react';
import { __ } from '@wordpress/i18n';
import { Database, Loader2, Pause, Play } from 'lucide-react';

import { useFBTBackfill } from '@/hooks/use-fbt-backfill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputNumber } from '@/components/ui/input-number';
import { Progress } from '@/components/ui/progress';

/**
 * FBT Backfill Card Component
 */
export function FBTBackfillCard() {
  const [batchSize, setBatchSize] = useState(50); // Lower default for better stability
  const { state, progress, isLoading, isFetchingStatus, statusData, start, pause, resume } =
    useFBTBackfill();

  const handleStart = () => {
    start(batchSize);
  };

  const getStatusText = () => {
    if (state.isRunning) {
      const errorText = state.errors > 0 ? `, ${state.errors} ${__('error(s)', 'yayboost')}` : '';
      return __(
        `Processing batch ${state.currentBatch}/${state.totalBatches}... (${state.processed}/${state.total} orders${errorText})`,
        'yayboost',
      );
    }
    if (state.isPaused) {
      return __('Paused', 'yayboost');
    }
    if (state.total > 0 && state.remaining === 0) {
      const errorText = state.errors > 0 ? ` (${state.errors} ${__('error(s)', 'yayboost')})` : '';
      return __('Completed!', 'yayboost') + errorText;
    }
    return '';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          <CardTitle>{__('Build Relationships from Historical Orders', 'yayboost')}</CardTitle>
        </div>
        <CardDescription>
          {__(
            'Scan your completed orders to build product relationship data. This helps improve recommendations based on what customers actually buy together.',
            'yayboost',
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Info */}
        {statusData && !state.isRunning && !state.isPaused && (
          <div>
            <div>
              <span className="text-gray-500">{__('Total orders:', 'yayboost')}</span>{' '}
              <strong>{statusData.total.toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-gray-500">{__('Already processed:', 'yayboost')}</span>{' '}
              <strong>{statusData.already_processed.toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-gray-500">{__('Pending:', 'yayboost')}</span>{' '}
              <strong className="text-orange-600">{statusData.unprocessed.toLocaleString()}</strong>
            </div>
            {state.errors > 0 && (
              <div>
                <span className="text-gray-500">{__('Errors:', 'yayboost')}</span>{' '}
                <strong className="text-red-600">{state.errors.toLocaleString()}</strong>
              </div>
            )}
          </div>
        )}

        {/* Batch Size Input */}
        {!state.isRunning && !state.isPaused && (
          <div className="space-y-2">
            <div className="w-40">
              <label className="mb-1 block text-sm font-medium">
                {__('Batch size', 'yayboost')}
              </label>
              <InputNumber
                value={batchSize}
                onValueChange={(val) => setBatchSize(val ?? 100)}
                min={10}
                max={500}
                step={10}
              />
            </div>
            <p className="text-muted-foreground">
              {__(
                'Orders processed per request. Higher = faster but uses more server resources.',
                'yayboost',
              )}
            </p>
          </div>
        )}

        {/* Progress Bar */}
        {(state.isRunning || state.isPaused || (state.total > 0 && state.remaining === 0)) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{getStatusText()}</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div>
              <Progress value={progress} className="h-3" />
            </div>
          </div>
        )}

        {/* Error Message */}
        {state.error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{state.error}</div>
        )}

        {/* Error Count Warning */}
        {state.errors > 0 && !state.isRunning && !state.isPaused && (
          <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
            {__(
              `${state.errors.toLocaleString()} order(s) encountered errors during processing. Check server logs for details.`,
              'yayboost',
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!state.isRunning && !state.isPaused && (
            <Button
              type="button"
              onClick={handleStart}
              disabled={isLoading || isFetchingStatus || statusData?.unprocessed === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {__('Starting...', 'yayboost')}
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  {__('Start Processing', 'yayboost')}
                </>
              )}
            </Button>
          )}

          {state.isRunning && (
            <Button type="button" variant="outline" onClick={pause}>
              <Pause className="mr-2 h-4 w-4" />
              {__('Pause', 'yayboost')}
            </Button>
          )}

          {state.isPaused && (
            <>
              <Button type="button" onClick={resume}>
                <Play className="mr-2 h-4 w-4" />
                {__('Resume', 'yayboost')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleStart}
                disabled={isLoading || isFetchingStatus || statusData?.unprocessed === 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {__('Starting...', 'yayboost')}
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    {__('Start Over', 'yayboost')}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
