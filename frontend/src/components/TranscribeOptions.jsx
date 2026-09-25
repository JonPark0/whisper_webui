import { useId } from 'react';
import { SelectField, TextArea } from './ui/Field';
import { ToggleRow } from './ui/Toggle';
import { Alert } from './ui/Alert';

export const TRANSLATION_OPTIONS = [
  { value: '', label: 'Don’t translate' },
  { value: 'en', label: 'English' },
  { value: 'ko', label: 'Korean' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
];

// Sent as-is to POST /api/transcribe (chunk fields are ignored by both
// Whisper engines; they segment long audio themselves).
export const DEFAULT_TRANSCRIBE_OPTIONS = {
  enable_timestamp: true,
  enable_chunked: false,
  chunk_length: 30,
  auto_enhance: false,
  translate_to: '',
  enhancement_prompt: '',
};

// Controlled options form (Figma "Section/Options").
export const TranscribeOptions = ({ value, onChange, engineInfo }) => {
  const id = useId();
  const set = (patch) => onChange({ ...value, ...patch });
  const enhancerUnavailable = engineInfo && engineInfo.enhancer_configured === false;

  return (
    <div className="flex flex-col gap-5">
      <ToggleRow
        id={`${id}-ts`}
        label="Timestamps"
        help={`Click-to-seek transcript with [00:01:23] markers.${
          engineInfo?.engine === 'Qwen3-ASR' ? ' Loads a 0.6B aligner (about +1.2 GB VRAM).' : ''
        }`}
        checked={value.enable_timestamp}
        onChange={(v) => set({ enable_timestamp: v })}
      />
      <ToggleRow
        id={`${id}-clean`}
        label="Clean up with Gemini"
        help="Fix punctuation, drop filler words, add structure."
        checked={value.auto_enhance}
        disabled={enhancerUnavailable}
        onChange={(v) => set({ auto_enhance: v, ...(v ? {} : { translate_to: '' }) })}
      />
      {enhancerUnavailable && (
        <Alert tone="warning" title="Gemini is not configured">
          Set GEMINI_API_KEY on the server to enable clean-up and translation.
        </Alert>
      )}
      <div className="grid gap-6 sm:grid-cols-2">
        <SelectField
          label="Translate to"
          help="Done by Gemini during clean-up."
          value={value.translate_to}
          disabled={!value.auto_enhance}
          onChange={(e) => set({ translate_to: e.target.value })}
          options={TRANSLATION_OPTIONS}
        />
      </div>
      {value.auto_enhance && (
        <TextArea
          label="Extra instructions for Gemini (optional)"
          help="Added to the default clean-up instructions, e.g. “Keep speaker names; spell product names as written.”"
          rows={3}
          value={value.enhancement_prompt}
          onChange={(e) => set({ enhancement_prompt: e.target.value })}
        />
      )}
    </div>
  );
};
