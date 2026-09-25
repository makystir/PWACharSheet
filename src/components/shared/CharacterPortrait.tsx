import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Upload, Trash2, ImageOff, X } from 'lucide-react';
import { validatePortraitFile } from '../../logic/portrait';
import styles from './CharacterPortrait.module.css';

interface CharacterPortraitProps {
  portrait: string;
  characterName: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
}

export function CharacterPortrait({ portrait, characterName, onUpload, onRemove }: CharacterPortraitProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [enlarged, setEnlarged] = useState(false);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Close the enlarged view on Escape while it is open.
  useEffect(() => {
    if (!enlarged) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEnlarged(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enlarged]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected
    e.target.value = '';

    setError('');
    const validation = validatePortraitFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file.');
      return;
    }

    onUpload(file);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.frame} style={{ width: 200, height: 280 }} data-testid="portrait-frame">
        {portrait ? (
          <button
            type="button"
            className={styles.enlargeTrigger}
            onClick={() => setEnlarged(true)}
            aria-label={`View enlarged portrait of ${characterName}`}
            aria-haspopup="dialog"
          >
            <img
              src={portrait}
              alt={`Portrait of ${characterName}`}
              className={styles.img}
            />
          </button>
        ) : (
          <div className={styles.placeholder}>
            <ImageOff size={40} />
            <span>No portrait set</span>
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <span className={styles.guidance}>Recommended: 400×560 px (max 5 MB)</span>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          aria-label="Upload portrait"
        />

        <button type="button" className={styles.btn} onClick={handleUploadClick}>
          <Upload size={14} />
          Upload Portrait
        </button>

        {portrait && (
          <button type="button" className={styles.removeBtn} onClick={onRemove}>
            <Trash2 size={14} />
            Remove
          </button>
        )}

        <div aria-live="polite" className={styles.error}>
          {error}
        </div>
      </div>

      {enlarged && portrait && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label={`Enlarged portrait of ${characterName}`}
          onClick={() => setEnlarged(false)}
        >
          <button
            type="button"
            className={styles.overlayClose}
            onClick={() => setEnlarged(false)}
            aria-label="Close enlarged portrait"
          >
            <X size={24} />
          </button>
          {/* Stop propagation so clicking the image itself doesn't close it. */}
          <img
            src={portrait}
            alt={`Enlarged portrait of ${characterName}`}
            className={styles.overlayImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
