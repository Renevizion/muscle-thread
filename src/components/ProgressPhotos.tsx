import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Camera, Upload, Trash2, X, Loader2, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PhotoRow {
  id: string;
  storage_path: string;
  caption: string | null;
  week_number: number | null;
  notes: string | null;
  taken_at: string;
}

interface PhotoWithUrl extends PhotoRow {
  url: string;
}

export const ProgressPhotos = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<PhotoWithUrl | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPhotos = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('user_id', user.id)
      .order('taken_at', { ascending: false });

    if (error) {
      toast.error('Could not load photos');
      setLoading(false);
      return;
    }

    const withUrls: PhotoWithUrl[] = await Promise.all(
      (data || []).map(async (p: PhotoRow) => {
        const { data: signed } = await supabase
          .storage
          .from('progress-photos')
          .createSignedUrl(p.storage_path, 60 * 60);
        return { ...p, url: signed?.signedUrl || '' };
      })
    );
    setPhotos(withUrls);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    setUploading(true);
    let success = 0;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} isn't an image`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is over 10MB`);
        continue;
      }
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('progress-photos')
        .upload(path, file, { contentType: file.type, upsert: false });

      if (upErr) {
        toast.error(`Upload failed: ${upErr.message}`);
        continue;
      }

      const { error: dbErr } = await supabase.from('progress_photos').insert({
        user_id: user.id,
        storage_path: path,
        caption: null,
      });

      if (dbErr) {
        toast.error('Could not save photo record');
        continue;
      }
      success++;
    }
    setUploading(false);
    if (success > 0) {
      toast.success(`Added ${success} photo${success > 1 ? 's' : ''}`);
      loadPhotos();
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deletePhoto = async (photo: PhotoWithUrl) => {
    if (!confirm('Delete this photo?')) return;
    await supabase.storage.from('progress-photos').remove([photo.storage_path]);
    const { error } = await supabase.from('progress_photos').delete().eq('id', photo.id);
    if (error) {
      toast.error('Could not delete');
      return;
    }
    setViewing(null);
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    toast.success('Deleted');
  };

  // Group by month for the timeline feel
  const grouped = photos.reduce<Record<string, PhotoWithUrl[]>>((acc, p) => {
    const d = new Date(p.taken_at);
    const key = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    (acc[key] ||= []).push(p);
    return acc;
  }, {});

  return (
    <div className="px-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-lg font-bold">Progress Photos</h2>
          <p className="text-xs text-muted-foreground">Your transformation timeline</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 bg-gradient-fire text-primary-foreground px-4 py-2 rounded-xl font-display font-semibold shadow-glow disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Uploading…' : 'Add Photos'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : photos.length === 0 ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-12 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-3 text-muted-foreground hover:bg-secondary/50 transition-colors"
        >
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
            <Camera className="w-6 h-6" />
          </div>
          <div className="text-center">
            <p className="font-display font-semibold text-foreground">No photos yet</p>
            <p className="text-xs mt-1">Snap your first progress pic to start tracking</p>
          </div>
        </button>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([month, items]) => (
            <div key={month}>
              <h3 className="text-sm font-display font-semibold text-muted-foreground mb-2">
                {month} · {items.length} photo{items.length > 1 ? 's' : ''}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {items.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => setViewing(photo)}
                    className="aspect-square rounded-xl overflow-hidden bg-secondary relative group"
                  >
                    {photo.url ? (
                      <img
                        src={photo.url}
                        alt={photo.caption || 'progress'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImagePlus className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                      <p className="text-[10px] text-white font-medium">
                        {new Date(photo.taken_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {viewing && (
        <div
          className={cn(
            'fixed inset-0 z-[60] bg-black/95 flex flex-col safe-top'
          )}
          onClick={() => setViewing(null)}
        >
          <div className="flex items-center justify-between px-4 py-3" onClick={(e) => e.stopPropagation()}>
            <div className="text-white">
              <p className="font-display font-semibold">
                {new Date(viewing.taken_at).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              {viewing.caption && <p className="text-xs text-white/70">{viewing.caption}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => deletePhoto(viewing)}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewing(null)}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
            <img
              src={viewing.url}
              alt={viewing.caption || 'progress'}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};
