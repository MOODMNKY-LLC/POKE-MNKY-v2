'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDuration, parseDuration } from '@/lib/youtube/utils';
import { formatDistanceToNow } from 'date-fns';
import { Play, Clock, Eye, ThumbsUp } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { YouTubeVideo } from '@/lib/youtube/types';
import type { ViewMode } from './video-gallery';

interface VideoCardProps {
  video: YouTubeVideo;
  viewMode: ViewMode;
  onClick: () => void;
}

export function VideoCard({ video, viewMode, onClick }: VideoCardProps) {
  const duration = video.duration ? formatDuration(parseDuration(video.duration)) : null;
  const publishedDate = new Date(video.published_at);
  const timeAgo = formatDistanceToNow(publishedDate, { addSuffix: true });

  if (viewMode === 'list') {
    return (
      <Card
        className="cursor-pointer hover:shadow-lg transition-shadow tap-target"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative w-64 h-36 flex-shrink-0 rounded-md overflow-hidden bg-muted">
              {video.thumbnail_medium_url ? (
                <Image
                  src={video.thumbnail_medium_url}
                  alt={video.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              {duration && (
                <Badge
                  variant="secondary"
                  className="absolute bottom-2 right-2 text-xs"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {duration}
                </Badge>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                {video.title}
              </h3>
              {video.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {video.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{timeAgo}</span>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{video.view_count.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ThumbsUp className="h-4 w-4" />
                  <span>{video.like_count.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const thumbnailUrl = video.thumbnail_high_url || video.thumbnail_medium_url || video.thumbnail_url || '';

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative aspect-video bg-muted">
        <button
          type="button"
          aria-label={`Play ${video.title}`}
          className="group relative w-full h-full cursor-pointer border-0 bg-transparent p-0"
          onClick={onClick}
        >
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={video.title}
              fill
              className="object-cover rounded-md border shadow-lg transition-all duration-200 ease-out group-hover:brightness-[0.8]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted rounded-md">
              <Play className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          
          {/* Hero Video Dialog style play button */}
          <div className="absolute inset-0 flex scale-[0.9] items-center justify-center rounded-2xl transition-all duration-200 ease-out group-hover:scale-100">
            <div className="bg-primary/10 flex size-20 md:size-28 items-center justify-center rounded-full backdrop-blur-md">
              <div className="from-primary/30 to-primary relative flex size-16 md:size-20 scale-100 items-center justify-center rounded-full bg-gradient-to-b shadow-md transition-all duration-200 ease-out group-hover:scale-[1.2]">
                <Play
                  className="size-6 md:size-8 scale-100 fill-white text-white transition-transform duration-200 ease-out group-hover:scale-105 ml-1"
                  style={{
                    filter:
                      "drop-shadow(0 4px 3px rgb(0 0 0 / 0.07)) drop-shadow(0 2px 2px rgb(0 0 0 / 0.06))",
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* Duration badge */}
          {duration && (
            <Badge
              variant="secondary"
              className="absolute bottom-2 right-2 text-xs z-10"
            >
              <Clock className="h-3 w-3 mr-1" />
              {duration}
            </Badge>
          )}
        </button>
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-semibold mb-2 line-clamp-2">
          {video.title}
        </h3>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{timeAgo}</span>
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span>{video.view_count.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThumbsUp className="h-3 w-3" />
            <span>{video.like_count.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
