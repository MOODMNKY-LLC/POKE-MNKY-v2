"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Play, Pause } from "lucide-react";

interface QueueStats {
  queue_name: string;
  queue_length: number;
  oldest_message_age: string;
}

interface SyncProgress {
  resource_type: string;
  synced_count: number;
  total_estimated: number;
  progress_percent: number;
}

interface CronStatus {
  job_name: string;
  schedule: string;
  active: boolean;
  last_run: string | null;
  next_run: string | null;
}

export function PokepediaSyncStatus() {
  const [queueStats, setQueueStats] = useState<QueueStats[]>([]);
  const [syncProgress, setSyncProgress] = useState<SyncProgress[]>([]);
  const [cronStatus, setCronStatus] = useState<CronStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [processing, setProcessing] = useState(false);

  const supabase = createClient();

  const fetchStats = async () => {
    try {
      // Fetch queue stats
      const { data: queueData, error: queueError } = await supabase.rpc(
        "get_pokepedia_queue_stats"
      );
      if (!queueError && queueData) {
        setQueueStats(queueData);
      }

      // Fetch sync progress
      const { data: progressData, error: progressError } = await supabase.rpc(
        "get_pokepedia_sync_progress"
      );
      if (!progressError && progressData) {
        setSyncProgress(progressData);
      }

      // Fetch cron status
      const { data: cronData, error: cronError } = await supabase.rpc(
        "get_pokepedia_cron_status"
      );
      if (!cronError && cronData) {
        setCronStatus(cronData);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const response = await fetch("/api/pokepedia/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Seed failed");
      console.log("Seed result:", data);
      await fetchStats();
    } catch (error) {
      console.error("Error seeding:", error);
      alert("Failed to seed: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSeeding(false);
    }
  };

  const handleProcessWorker = async () => {
    setProcessing(true);
    try {
      const response = await fetch("/api/pokepedia/worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchSize: 10,
          concurrency: 4,
          enqueueSprites: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Worker failed");
      console.log("Worker result:", data);
      await fetchStats();
    } catch (error) {
      console.error("Error processing:", error);
      alert("Failed to process: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessSprites = async () => {
    setProcessing(true);
    try {
      const response = await fetch("/api/pokepedia/sprite-worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchSize: 10,
          concurrency: 3,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sprite worker failed");
      console.log("Sprite worker result:", data);
      await fetchStats();
    } catch (error) {
      console.error("Error processing sprites:", error);
      alert("Failed to process sprites: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div>Loading sync status...</div>;
  }

  const totalQueueLength = queueStats.reduce((sum, q) => sum + (q.queue_length || 0), 0);
  const totalSynced = syncProgress.reduce((sum, p) => sum + (p.synced_count || 0), 0);
  const totalEstimated = syncProgress.reduce((sum, p) => sum + (p.total_estimated || 0), 0);
  const overallProgress = totalEstimated > 0 ? (totalSynced / totalEstimated) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Poképedia Sync Status</CardTitle>
              <CardDescription>
                Queue-based sync system for comprehensive PokéAPI data
              </CardDescription>
            </div>
            <Button onClick={fetchStats} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {totalSynced.toLocaleString()} / {totalEstimated.toLocaleString()} resources
              </span>
            </div>
            <Progress value={overallProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {overallProgress.toFixed(1)}% complete
            </p>
          </div>

          {/* Queue Stats */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Queue Status</h3>
            <div className="grid grid-cols-2 gap-4">
              {queueStats.map((stat) => (
                <div key={stat.queue_name} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{stat.queue_name}</span>
                    <Badge variant={stat.queue_length > 0 ? "default" : "secondary"}>
                      {stat.queue_length || 0} messages
                    </Badge>
                  </div>
                  {stat.oldest_message_age && (
                    <p className="text-xs text-muted-foreground">
                      Oldest: {stat.oldest_message_age}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sync Progress by Resource Type */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Progress by Resource Type</h3>
            <div className="space-y-3">
              {syncProgress.map((progress) => (
                <div key={progress.resource_type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{progress.resource_type}</span>
                    <span className="text-xs text-muted-foreground">
                      {progress.synced_count} / {progress.total_estimated}
                    </span>
                  </div>
                  <Progress value={progress.progress_percent} className="h-1.5" />
                </div>
              ))}
            </div>
          </div>

          {/* Cron Status */}
          {cronStatus.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Cron Jobs</h3>
              <div className="space-y-2">
                {cronStatus.map((cron) => (
                  <div key={cron.job_name} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{cron.job_name}</span>
                      <span className="text-muted-foreground ml-2">({cron.schedule})</span>
                    </div>
                    <Badge variant={cron.active ? "default" : "secondary"}>
                      {cron.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSeed} disabled={seeding} variant="default">
              <Play className="h-4 w-4 mr-2" />
              {seeding ? "Seeding..." : "Seed Queue"}
            </Button>
            <Button onClick={handleProcessWorker} disabled={processing} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Process Worker
            </Button>
            <Button onClick={handleProcessSprites} disabled={processing} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Process Sprites
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
