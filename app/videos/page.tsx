import { Suspense } from 'react';
import { VideoGallery } from '@/components/videos/video-gallery';
import { VideoGallerySkeleton } from '@/components/videos/video-gallery-skeleton';

export const metadata = {
  title: 'Video Gallery | POKE MNKY',
  description: 'Watch and explore videos from Average At Best Draft League',
};

export default function VideosPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Video Gallery</h1>
        <p className="text-muted-foreground">
          Watch battles, highlights, and content from Average At Best Draft League
        </p>
      </div>
      
      <Suspense fallback={<VideoGallerySkeleton />}>
        <VideoGallery />
      </Suspense>
    </div>
  );
}
