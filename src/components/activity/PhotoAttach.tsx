import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, ImagePlus, X, Loader2 } from 'lucide-react';
import type { ActivityAttachment } from '@/types/loan';

interface PhotoAttachProps {
  /** Current staged files (before upload) */
  previews: PhotoPreview[];
  onChange: (previews: PhotoPreview[]) => void;
  compact?: boolean;
}

export interface PhotoPreview {
  file: File;
  previewUrl: string;
}

export function PhotoAttach({ previews, onChange, compact }: PhotoAttachProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newPreviews: PhotoPreview[] = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
    onChange([...previews, ...newPreviews]);
  };

  const removePreview = (index: number) => {
    const updated = [...previews];
    URL.revokeObjectURL(updated[index].previewUrl);
    updated.splice(index, 1);
    onChange(updated);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Preview thumbnails */}
      {previews.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {previews.map((p, i) => (
            <div key={i} className="relative h-16 w-16 rounded-md overflow-hidden border border-border">
              <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePreview(i)}
                className="absolute top-0 right-0 bg-black/50 rounded-bl-md p-0.5"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={compact ? 'h-7 w-7 p-0' : 'h-8 text-xs'}
          onClick={() => cameraRef.current?.click()}
          title="Take photo"
        >
          <Camera className="h-3.5 w-3.5" />
          {!compact && <span className="ml-1">Camera</span>}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={compact ? 'h-7 w-7 p-0' : 'h-8 text-xs'}
          onClick={() => galleryRef.current?.click()}
          title="Choose from gallery"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          {!compact && <span className="ml-1">Gallery</span>}
        </Button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

/** Renders attached photos as a thumbnail grid in note bubbles */
export function AttachmentGallery({ attachments }: { attachments: ActivityAttachment[] | null }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!attachments?.length) return null;

  return (
    <>
      <div className={`flex gap-1.5 flex-wrap mt-1.5 ${attachments.length === 1 ? '' : ''}`}>
        {attachments.map((a, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setExpanded(a.url)}
            className="rounded-md overflow-hidden border border-border/40 hover:border-primary/40 transition-colors"
          >
            <img
              src={a.url}
              alt={a.filename}
              className={attachments.length === 1
                ? 'max-h-48 max-w-full object-cover rounded-md'
                : 'h-20 w-20 object-cover'
              }
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {/* Fullscreen lightbox */}
      {expanded && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setExpanded(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setExpanded(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={expanded}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
}
