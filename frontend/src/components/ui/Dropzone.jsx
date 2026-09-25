import { useRef, useState } from 'react';
import { Icon } from './Icon';
import { ProgressBar } from './ProgressBar';

export const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'];

// Figma "Dropzone": Idle | Drag Over | Uploading. The whole area is a button
// (Enter/Space opens the picker) and stays usable while uploads run.
export const Dropzone = ({ onFiles, uploads = [], maxSizeLabel = '500 MB' }) => {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const uploading = uploads.find((u) => u.progress < 100);

  const accept = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length) onFiles(files);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); accept(e.dataTransfer.files); }}
        className={`w-full h-[200px] flex flex-col items-center justify-center gap-2 rounded-lg border-dashed transition-colors ${
          dragOver ? 'border-2 border-accent bg-accent-subtle' : 'border-[1.5px] border-line-strong bg-surface hover:bg-canvas'
        }`}
      >
        <span className={`flex h-12 w-12 items-center justify-center rounded-full ${dragOver ? 'bg-accent text-on-accent' : 'bg-accent-subtle text-accent-text'}`}>
          <Icon name="upload" size={24} />
        </span>
        {uploading ? (
          <span className="w-full max-w-sm flex flex-col items-center gap-2">
            <span className="font-sans text-body font-medium text-ink truncate max-w-full">
              Uploading {uploading.name}
              {uploads.length > 1 && ` · ${uploads.findIndex((u) => u === uploading) + 1} of ${uploads.length}`}
            </span>
            <ProgressBar value={uploading.progress} showValue label={`Uploading ${uploading.name}`} />
          </span>
        ) : (
          <>
            <span className="font-sans text-body font-medium text-ink">
              {dragOver ? 'Release to upload' : 'Drop audio files here, or browse'}
            </span>
            <span className="font-display text-caption font-light text-ink-3">
              MP3 · WAV · FLAC · AAC · OGG · M4A · WMA — up to {maxSizeLabel} each
            </span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={AUDIO_EXTENSIONS.join(',')}
        className="hidden"
        onChange={(e) => { accept(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
};
