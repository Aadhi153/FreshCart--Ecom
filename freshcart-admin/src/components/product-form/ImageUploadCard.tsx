import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { uploadProductImage } from '../../lib/api';
import { useToast } from '../ToastProvider';

interface ImageUploadCardProps {
  imageUrl: string;
  onChange: (imageUrl: string) => void;
}

export default function ImageUploadCard({ imageUrl, onChange }: ImageUploadCardProps) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      onChange(url);
    } catch (err) {
      console.error('Error uploading product image:', err);
      showToast('Failed to upload image. See console for details.', 'error');
    } finally {
      setUploading(false);
    }
  }

  const displayUrl = imageUrl || previewUrl;

  return (
    <div className="pf-card">
      <h3 className="pf-card-title">Product Image</h3>

      <div
        className={`pf-dropzone${isDragOver ? ' pf-dropzone-active' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setIsDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload product image"
      >
        {displayUrl ? (
          <img src={displayUrl} alt="Product preview" className="pf-dropzone-preview" />
        ) : (
          <>
            <UploadCloud size={28} style={{ color: 'var(--text-secondary)' }} />
            <p className="pf-dropzone-text">
              {uploading ? 'Uploading…' : 'Drag & drop image or click to browse'}
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          disabled={uploading}
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0];
            e.target.value = '';
            handleFile(file);
          }}
        />
      </div>
    </div>
  );
}
