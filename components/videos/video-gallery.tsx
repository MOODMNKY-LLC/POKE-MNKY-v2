'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VideoCard } from './video-card';
import { VideoPlayerModal } from './video-player-modal';
import { Search, Grid3x3, List, Loader2 } from 'lucide-react';
import type { YouTubeVideo } from '@/lib/youtube/types';

type ViewMode = 'grid' | 'list';
type SortOption = 'newest' | 'oldest' | 'views' | 'likes';

export function VideoGallery() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch videos
  useEffect(() => {
    async function fetchVideos() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/youtube/videos?maxResults=24&sync=true');
        if (!response.ok) {
          throw new Error('Failed to fetch videos');
        }
        
        const data = await response.json();
        setVideos(data.videos || []);
        setNextPageToken(data.nextPageToken);
      } catch (err: any) {
        setError(err.message || 'Failed to load videos');
      } finally {
        setLoading(false);
      }
    }

    fetchVideos();
  }, []);

  // Load more videos
  async function loadMore() {
    if (!nextPageToken || loadingMore) return;
    
    try {
      setLoadingMore(true);
      const response = await fetch(
        `/api/youtube/videos?maxResults=24&pageToken=${nextPageToken}&sync=true`
      );
      
      if (!response.ok) {
        throw new Error('Failed to load more videos');
      }
      
      const data = await response.json();
      setVideos(prev => [...prev, ...(data.videos || [])]);
      setNextPageToken(data.nextPageToken);
    } catch (err: any) {
      console.error('Error loading more videos:', err);
    } finally {
      setLoadingMore(false);
    }
  }

  // Filter and sort videos
  const filteredAndSortedVideos = videos
    .filter(video => {
      if (!debouncedSearch) return true;
      const query = debouncedSearch.toLowerCase();
      return (
        video.title.toLowerCase().includes(query) ||
        video.description?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
        case 'oldest':
          return new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
        case 'views':
          return b.view_count - a.view_count;
        case 'likes':
          return b.like_count - a.like_count;
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="views">Most Views</SelectItem>
            <SelectItem value="likes">Most Likes</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredAndSortedVideos.length} of {videos.length} videos
      </div>

      {/* Video grid/list */}
      {filteredAndSortedVideos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No videos found</p>
        </div>
      ) : (
        <>
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }
          >
            {filteredAndSortedVideos.map((video) => (
              <VideoCard
                key={video.youtube_video_id}
                video={video}
                viewMode={viewMode}
                onClick={() => setSelectedVideo(video)}
              />
            ))}
          </div>

          {/* Load more button */}
          {nextPageToken && (
            <div className="flex justify-center pt-6">
              <Button
                onClick={loadMore}
                disabled={loadingMore}
                variant="outline"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More Videos'
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Video player modal */}
      {selectedVideo && (
        <VideoPlayerModal
          video={selectedVideo}
          open={!!selectedVideo}
          onOpenChange={(open) => !open && setSelectedVideo(null)}
        />
      )}
    </div>
  );
}
