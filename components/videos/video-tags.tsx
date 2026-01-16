'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { UserPlus, X, AtSign } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface VideoTagsProps {
  videoId: string;
}

interface Tag {
  id: string;
  tagged_user_id: string;
  tagged_by_user_id: string;
  tag_type: string;
  note: string | null;
  created_at: string;
  tagged_user?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  tagged_by_user?: {
    display_name: string | null;
  };
}

export function VideoTags({ videoId }: VideoTagsProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [tagNote, setTagNote] = useState('');

  // Load tags
  useEffect(() => {
    loadTags();
  }, [videoId]);

  async function loadTags() {
    try {
      // Get video ID from Supabase
      const { data: video } = await supabase
        .from('videos')
        .select('id')
        .eq('youtube_video_id', videoId)
        .single();

      if (!video) return;

      // Get all tags
      const { data: allTags } = await supabase
        .from('video_tags')
        .select(`
          *,
          tagged_user:tagged_user_id (
            display_name,
            avatar_url
          ),
          tagged_by_user:tagged_by_user_id (
            display_name
          )
        `)
        .eq('video_id', video.id)
        .order('created_at', { ascending: false });

      if (allTags) {
        setTags(allTags as any);
      }
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  }

  async function searchUsers(query: string) {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .ilike('display_name', `%${query}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  async function createTag(userId: string) {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to tag users',
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
        .from('video_tags')
        .insert({
          video_id: video.id,
          tagged_user_id: userId,
          tagged_by_user_id: user.id,
          tag_type: 'mention',
          note: tagNote || null,
        });

      if (error) throw error;

      // Send Discord notification
      try {
        await fetch('/api/discord/video-tag-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: videoId,
            taggedUserId: userId,
            taggedByUserId: user.id,
            note: tagNote,
          }),
        });
      } catch (discordError) {
        console.error('Discord notification error:', discordError);
        // Don't fail the tag creation if Discord fails
      }

      toast({
        title: 'User tagged',
        description: 'The user has been notified',
      });

      setSearchQuery('');
      setSelectedUser(null);
      setTagNote('');
      loadTags();
    } catch (error: any) {
      console.error('Error creating tag:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to tag user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function deleteTag(tagId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('video_tags')
        .delete()
        .eq('id', tagId)
        .eq('tagged_by_user_id', user.id); // Only allow deleting own tags

      if (error) throw error;

      loadTags();
    } catch (error: any) {
      console.error('Error deleting tag:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove tag',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Tag form */}
      <div className="space-y-4 p-4 border rounded-lg">
        <div>
          <Label>Tag a User</Label>
          <div className="relative mt-2">
            <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser(user.id);
                      setSearchQuery(user.display_name || '');
                      setSearchResults([]);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-accent flex items-center gap-2"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{user.display_name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <span>{user.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedUser && (
          <>
            <div>
              <Label htmlFor="tagNote">Note (optional)</Label>
              <Input
                id="tagNote"
                placeholder="Why are you tagging them?"
                value={tagNote}
                onChange={(e) => setTagNote(e.target.value)}
                className="mt-2"
              />
            </div>
            <Button
              onClick={() => createTag(selectedUser)}
              disabled={loading}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {loading ? 'Tagging...' : 'Tag User'}
            </Button>
          </>
        )}
      </div>

      {/* Tags list */}
      <div className="space-y-4">
        <h3 className="font-semibold">Tagged Users</h3>
        {tags.length === 0 ? (
          <p className="text-muted-foreground text-sm">No users tagged yet.</p>
        ) : (
          tags.map((tag) => (
            <div key={tag.id} className="p-4 border rounded-lg flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarImage src={tag.tagged_user?.avatar_url || undefined} />
                  <AvatarFallback>
                    {tag.tagged_user?.display_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">
                      {tag.tagged_user?.display_name || 'Unknown User'}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {tag.tag_type}
                    </Badge>
                  </div>
                  {tag.note && (
                    <p className="text-sm text-muted-foreground mb-1">{tag.note}</p>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Tagged by {tag.tagged_by_user?.display_name || 'Unknown'} •{' '}
                    {formatDistanceToNow(new Date(tag.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteTag(tag.id)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
