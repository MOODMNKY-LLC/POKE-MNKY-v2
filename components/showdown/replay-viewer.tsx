'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { extractReplayId } from '@/lib/showdown/replay-utils';

interface ReplayViewerProps {
  /** Replay ID (e.g., "gen9randombattle-35") or full room URL */
  replayIdOrUrl: string;
  /** Optional custom server URL for replay logs */
  serverUrl?: string;
  /** Optional custom client URL for replay-embed.js */
  clientUrl?: string;
  /** Height of the replay container */
  height?: string;
  /** Show external link button */
  showExternalLink?: boolean;
  /** Use iframe mode (more reliable fallback) */
  useIframe?: boolean;
}

export function ReplayViewer({
  replayIdOrUrl,
  serverUrl,
  clientUrl,
  height = '800px',
  showExternalLink = true,
  useIframe = true, // Default to iframe for reliability
}: ReplayViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replayId, setReplayId] = useState<string | null>(null);

  // Extract replay ID from URL or use as-is
  useEffect(() => {
    const id = extractReplayId(replayIdOrUrl);
    setReplayId(id);
  }, [replayIdOrUrl]);

  // Initialize replay viewer
  useEffect(() => {
    if (!replayId || !containerRef.current) return;

    let mounted = true;

    const initializeReplay = async () => {
      try {
        setLoading(true);
        setError(null);

        // Clear container
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        if (useIframe) {
          // Use iframe approach (most reliable)
          const replayUrl = `https://aab-replay.moodmnky.com/${replayId}`;
          
          // Verify replay exists by checking if URL is accessible
          try {
            const checkResponse = await fetch(replayUrl, { method: 'HEAD' });
            if (!checkResponse.ok && checkResponse.status !== 405) {
              // 405 Method Not Allowed is OK for HEAD requests
              throw new Error(`Replay not found: ${replayId}`);
            }
          } catch (checkError) {
            // If HEAD fails, try GET (some servers don't support HEAD)
            console.warn('HEAD request failed, proceeding with iframe');
          }

          if (!mounted || !containerRef.current) return;

          // Create iframe
          const iframe = document.createElement('iframe');
          iframe.src = replayUrl;
          iframe.width = '100%';
          iframe.height = height;
          iframe.frameBorder = '0';
          iframe.style.border = 'none';
          iframe.style.borderRadius = '0.5rem';
          iframe.allowFullScreen = true;
          iframe.onload = () => {
            if (mounted) {
              setLoading(false);
            }
          };
          iframe.onerror = () => {
            if (mounted) {
              setError('Failed to load replay');
              setLoading(false);
            }
          };

          containerRef.current.appendChild(iframe);
          iframeRef.current = iframe;
        } else {
          // Try replay-embed.js approach (experimental)
          // This requires understanding the replay-embed.js API
          // For now, fallback to iframe
          const replayUrl = `https://aab-replay.moodmnky.com/${replayId}`;
          if (containerRef.current) {
            containerRef.current.innerHTML = `<iframe src="${replayUrl}" width="100%" height="${height}" frameborder="0" style="border: none; border-radius: 0.5rem;"></iframe>`;
            setLoading(false);
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load replay');
          setLoading(false);
        }
      }
    };

    initializeReplay();

    return () => {
      mounted = false;
    };
  }, [replayId, height, useIframe]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // Force re-initialization
    setReplayId(null);
    setTimeout(() => {
      const id = extractReplayId(replayIdOrUrl);
      setReplayId(id);
    }, 100);
  };

  const externalReplayUrl = replayId 
    ? `https://aab-replay.moodmnky.com/${replayId}`
    : null;

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to Load Replay</AlertTitle>
            <AlertDescription className="mt-2">
              {error}
              {replayId && (
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleRetry}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                  {showExternalLink && externalReplayUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={externalReplayUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in New Tab
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full">
      {loading && (
        <Card className="w-full">
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading replay...</p>
              {replayId && (
                <p className="text-sm text-muted-foreground mt-2 font-mono">{replayId}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      <div
        ref={containerRef}
        className="replay-container w-full rounded-lg overflow-hidden bg-muted/30"
        style={{ minHeight: loading ? height : 'auto' }}
      />
      
      {showExternalLink && externalReplayUrl && !loading && (
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" asChild>
            <a href={externalReplayUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
