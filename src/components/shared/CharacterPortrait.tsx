import { useRef, useState } from 'react';
import type { CSSProperties, ChangeEvent } from 'react';
import { Upload, Trash2, ImageOff } from 'lucide-react';
import { validatePortraitFile, readFileAsDataURL } from '../../logic/portrait';

interface CharacterPortraitProps {
  portrait: string;
  characterName: string;
  onUpload: (dataUrl: string) => void;
  onRemove: () => void;
}

const frameStyle: CSSProperties = {
  width: 200,
  height: 280,
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--card-border)',
  borderRadius: 'var(--radius-md)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  flexShrink: 0,
};

const placeholderStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
  color: 'var(--text-muted)',
  fontSize: '13px',
};

const imgStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
};

const controlsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '6px',
  marginTop: '8px',
  width: 200,
};

const btnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '5px 10px',
  background: 'var(--bg-tertiary)',
  color: 'var(--accent-gold)',
  border: '1px solid var(--accent-gold-dark)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '12px',
  cursor: 'pointer',
};

const removeBtnStyle: CSSProperties = {
  ...btnStyle,
  color: 'var(--danger)',
  border: '1px solid var(--danger)',
};

const guidanceStyle: CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-muted)',
};

const errorStyle: CSSProperties = {
  fontSize: '11px',
  color: 'var(--danger)',
  textAlign: 'center',
  minHeight: '16px',
};

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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={frameStyle} data-testid="portrait-frame">
        {portrait ? (
          <img
            src={portrait}
            alt={`Portrait of ${characterName}`}
            style={imgStyle}
          />
        ) : (
          <div style={placeholderStyle}>
            <ImageOff size={40} />
            <span>No portrait set</span>
          </div>
        )}
      </div>

      <div style={controlsStyle}>
        <span style={guidanceStyle}>Recommended: 200×280 px</span>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          aria-label="Upload portrait"
        />

        <button type="button" style={btnStyle} onClick={handleUploadClick}>
          <Upload size={14} />
          Upload Portrait
        </button>

        {portrait && (
          <button type="button" style={removeBtnStyle} onClick={onRemove}>
            <Trash2 size={14} />
            Remove
          </button>
        )}

        <div aria-live="polite" style={errorStyle}>
          {error}
        </div>
      </div>
    </div>
  );
}
