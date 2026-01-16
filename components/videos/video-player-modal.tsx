'use client';

import { AnimatePresence, motion } from 'motion/react';
import { XIcon } from 'lucide-react';
import { VideoFeedback } from './video-feedback';
import { VideoTags } from './video-tags';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { Eye, ThumbsUp, MessageSquare, Calendar } from 'lucide-react';
import type { YouTubeVideo } from '@/lib/youtube/types';

interface VideoPlayerModalProps {
  video: YouTubeVideo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoPlayerModal({ video, open, onOpenChange }: VideoPlayerModalProps) {
  const publishedDate = new Date(video.published_at);
  const timeAgo = formatDistanceToNow(publishedDate, { addSuffix: true });
  const videoSrc = `https://www.youtube.com/embed/${video.youtube_video_id}?autoplay=1`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onOpenChange(false);
            }
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onOpenChange(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative mx-2 sm:mx-4 w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto bg-background rounded-xl sm:rounded-2xl border shadow-lg scrollbar-hide safe-area-padding"
            onClick={(e) => e.stopPropagation()}
          >
                   {/* Close button */}
                   <motion.button
                     onClick={() => onOpenChange(false)}
                     className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 rounded-full bg-neutral-900/50 p-2 sm:p-2.5 text-xl text-white ring-1 backdrop-blur-md hover:bg-neutral-800/50 active:bg-neutral-700/50 transition-colors dark:bg-neutral-100/50 dark:text-black dark:hover:bg-neutral-200/50 dark:active:bg-neutral-300/50 tap-target"
                     aria-label="Close video"
                   >
                     <XIcon className="size-4 sm:size-5" />
                   </motion.button>

                   <div className="p-4 sm:p-6">
                     <h2 className="text-lg sm:text-xl font-semibold mb-4 pr-10 sm:pr-12">{video.title}</h2>
              
              <div className="space-y-6">
                       {/* Video player with Hero Video Dialog style */}
                       <div className="relative aspect-video bg-black rounded-xl sm:rounded-2xl overflow-hidden border-2 border-white shadow-xl">
                         <iframe
                           src={videoSrc}
                           title={video.title}
                           className="w-full h-full rounded-xl sm:rounded-2xl"
                           allowFullScreen
                           allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                         />
                       </div>

                {/* Video metadata */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{timeAgo}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{video.view_count.toLocaleString()} views</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="h-4 w-4" />
                    <span>{video.like_count.toLocaleString()} likes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>{video.comment_count.toLocaleString()} comments</span>
                  </div>
                </div>

                {/* Description */}
                {video.description && (
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      {video.description}
                    </p>
                  </div>
                )}

                {/* Tabs for feedback and tags */}
                <Tabs defaultValue="feedback" className="w-full">
                  <TabsList>
                    <TabsTrigger value="feedback">Feedback</TabsTrigger>
                    <TabsTrigger value="tags">Tags</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="feedback" className="mt-4">
                    <VideoFeedback videoId={video.youtube_video_id} />
                  </TabsContent>
                  
                  <TabsContent value="tags" className="mt-4">
                    <VideoTags videoId={video.youtube_video_id} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
