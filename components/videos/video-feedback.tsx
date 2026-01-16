'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Heart, Smile, Lightbulb, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface VideoFeedbackProps {
  videoId: string;
}

interface Feedback {
  id: string;
  rating: number | null;
  comment: string | null;
  reaction: string | null;
  user_id: string;
  created_at: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

const REACTIONS = [
  { value: 'like', label: 'Like', icon: ThumbsUp },
  { value: 'love', label: 'Love', icon: Heart },
  { value: 'funny', label: 'Funny', icon: Smile },
  { value: 'helpful', label: 'Helpful', icon: Lightbulb },
  { value: 'insightful', label: 'Insightful', icon: Lightbulb },
];

export function VideoFeedback({ videoId }: VideoFeedbackProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [userFeedback, setUserFeedback] = useState<Feedback | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [reaction, setReaction] = useState<string | null>(null);

  // Load feedback
  useEffect(() => {
    loadFeedback();
  }, [videoId]);

  async function loadFeedback() {
    try {
      // Get video ID from Supabase
      const { data: video } = await supabase
        .from('videos')
        .select('id')
        .eq('youtube_video_id', videoId)
        .single();

      if (!video) return;

      // Get all feedback
      const { data: allFeedback } = await supabase
        .from('video_feedback')
        .select(`
          *,
          profiles:user_id (
            display_name,
            avatar_url
          )
        `)
        .eq('video_id', video.id)
        .order('created_at', { ascending: false });

      if (allFeedback) {
        setFeedback(allFeedback as any);
      }

      // Get current user's feedback
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userFeedbackData } = await supabase
          .from('video_feedback')
          .select('*')
          .eq('video_id', video.id)
          .eq('user_id', user.id)
          .single();

        if (userFeedbackData) {
          setUserFeedback(userFeedbackData);
          setRating(userFeedbackData.rating);
          setComment(userFeedbackData.comment || '');
          setReaction(userFeedbackData.reaction);
        }
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  }

  async function submitFeedback() {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to leave feedback',
          variant: 'destructive',
        });
        return;
      }

      // Get video ID from Supabase
      const { data: video } = await supabase
        .from('videos')
        .select('id')
        .eq('youtube_video_id', videoId)
        .single();

      if (!video) {
        throw new Error('Video not found');
      }

      const { error } = await supabase
        .from('video_feedback')
        .upsert({
          video_id: video.id,
          user_id: user.id,
          rating,
          comment: comment || null,
          reaction: reaction || null,
        }, {
          onConflict: 'video_id,user_id',
        });

      if (error) throw error;

      toast({
        title: 'Feedback submitted',
        description: 'Thank you for your feedback!',
      });

      loadFeedback();
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit feedback',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Feedback form */}
      <div className="space-y-4 p-4 border rounded-lg">
        <div>
          <Label>Rating</Label>
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="focus:outline-none"
              >
                <Star
                  className={`h-6 w-6 ${
                    rating && star <= rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Reaction</Label>
          <div className="flex gap-2 mt-2 flex-wrap">
            {REACTIONS.map((r) => {
              const Icon = r.icon;
              return (
                <Button
                  key={r.value}
                  type="button"
                  variant={reaction === r.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReaction(reaction === r.value ? null : r.value)}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {r.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div>
          <Label htmlFor="comment">Comment</Label>
          <Textarea
            id="comment"
            placeholder="Share your thoughts..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="mt-2"
            rows={3}
          />
        </div>

        <Button onClick={submitFeedback} disabled={loading}>
          {loading ? 'Submitting...' : userFeedback ? 'Update Feedback' : 'Submit Feedback'}
        </Button>
      </div>

      {/* Feedback list */}
      <div className="space-y-4">
        <h3 className="font-semibold">Community Feedback</h3>
        {feedback.length === 0 ? (
          <p className="text-muted-foreground text-sm">No feedback yet. Be the first to share your thoughts!</p>
        ) : (
          feedback.map((item) => (
            <div key={item.id} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {item.profiles?.display_name || 'Anonymous'}
                  </span>
                  {item.rating && (
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${
                            star <= item.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </span>
              </div>
              {item.reaction && (
                <div className="mb-2">
                  {REACTIONS.find(r => r.value === item.reaction) && (
                    <Button variant="outline" size="sm" disabled>
                      {(() => {
                        const Icon = REACTIONS.find(r => r.value === item.reaction)!.icon;
                        return (
                          <>
                            <Icon className="h-3 w-3 mr-1" />
                            {REACTIONS.find(r => r.value === item.reaction)!.label}
                          </>
                        );
                      })()}
                    </Button>
                  )}
                </div>
              )}
              {item.comment && (
                <p className="text-sm text-muted-foreground">{item.comment}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
