import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Upload, Trash2, ImageOff } from 'lucide-react';
import { validatePortraitFile, readFileAsDataURL } from '../../logic/portrait';
import styles from './CharacterPortrait.module.css';

interface CharacterPortraitProps {
  portrait: string;
  characterName: string;
  onUpload: (dataUrl: string) => void;
  onRemove: () => void;
}

export function CharacterPortrait({ portrait, characterName, onUpload, onRemove }: CharacterPortraitProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

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

    try {
      const dataUrl = await readFileAsDataURL(file);
      onUpload(dataUrl);
    } catch {
      setError('Failed to read file.');
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.frame} style={{ width: 200, height: 280 }} data-testid="portrait-frame">
        {portrait ? (
          <img
            src={portrait}
            alt={`Portrait of ${characterName}`}
            className={styles.img}
          />
        ) : (
          <div className={styles.placeholder}>
            <ImageOff size={40} />
            <span>No portrait set</span>
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <span className={styles.guidance}>Recommended: 200×280 px</span>

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
    </div>
  );
}
