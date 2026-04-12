'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface ImageUploadProps {
  /** Current image paths/urls */
  images: string[];
  /** Called with the updated array when images are added or removed */
  onChange: (images: string[]) => void;
  /** Maximum number of images allowed */
  max?: number;
}

export default function ImageUpload({ images, onChange, max = 20 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = max - images.length;
    if (remaining <= 0) {
      setError(`Maximum of ${max} images allowed`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    setError('');

    try {
      const res = await api.uploadImages(filesToUpload);
      onChange([...images, ...res.data]);
    } catch (err: any) {
      setError(err?.message || 'Failed to upload images');
    } finally {
      setUploading(false);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function removeImage(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div>
      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {images.map((src, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-light">
              <img
                src={src.startsWith('/') ? `${process.env.NEXT_PUBLIC_API_URL || ''}${src}` : src}
                alt={`Photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {images.length < max && (
        <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-light rounded-lg cursor-pointer hover:border-teal/50 hover:bg-teal/5 transition-colors text-sm text-primary/60">
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload Photos
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={handleFiles}
            disabled={uploading}
            className="hidden"
          />
        </label>
      )}

      {error && (
        <p className="text-xs text-accent mt-1">{error}</p>
      )}
    </div>
  );
}
