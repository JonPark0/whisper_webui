import { useEffect, useState } from 'react';

export const TranscribeOptions = ({ onChange, engineInfo }) => {
  const [options, setOptions] = useState({
    enable_timestamp: true,
    enable_chunked: false,
    chunk_length: 30,
    translate_to: '',
    auto_enhance: false,
    enhancement_prompt: '',
  });

  // Report the initial defaults too: the parent submits whatever it last
  // received, so without this a job created before touching any control was
  // sent with none of these options (e.g. timestamps shown ON but sent OFF).
  useEffect(() => {
    if (onChange) {
      onChange(options);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (key, value) => {
    const newOptions = { ...options, [key]: value };
    // Translation is performed by the Gemini clean-up step, so it is only
    // meaningful while auto-enhance is on.
    if (key === 'auto_enhance' && !value) {
      newOptions.translate_to = '';
    }
    setOptions(newOptions);
    if (onChange) {
      onChange(newOptions);
    }
  };

  // Engines that split long audio themselves (Qwen3-ASR) ignore the per-job
  // chunk settings; hide them instead of offering a no-op. Unknown engine
  // (info not loaded yet / older backend) keeps the old behaviour.
  const showChunking = engineInfo?.manual_chunking !== false;
  const enhancerUnavailable = engineInfo && engineInfo.enhancer_configured === false;

  return (
    <div className="w-full p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Transcription Options</h3>

      <div className="space-y-4">
        {/* Timestamp */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Enable Timestamps
            </label>
            <p className="text-xs text-gray-500">Add time markers to transcript</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={options.enable_timestamp}
              onChange={(e) => handleChange('enable_timestamp', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {!showChunking && engineInfo?.max_chunk_sec && (
          <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
            Long audio is split automatically at silences into pieces of up to {Math.round(engineInfo.max_chunk_sec)} seconds.
          </p>
        )}

        {/* Chunked Processing */}
        {showChunking && (
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Chunked Processing
            </label>
            <p className="text-xs text-gray-500">Process long audio in chunks</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={options.enable_chunked}
              onChange={(e) => handleChange('enable_chunked', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        )}

        {/* Chunk Length */}
        {showChunking && options.enable_chunked && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chunk Length (seconds)
            </label>
            <input
              type="number"
              min="10"
              max="300"
              value={options.chunk_length}
              onChange={(e) => handleChange('chunk_length', parseInt(e.target.value, 10) || 30)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Auto Enhancement */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Auto-Enhance with Gemini
              </label>
              <p className="text-xs text-gray-500">
                Automatically improve transcript quality
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={options.auto_enhance}
                disabled={enhancerUnavailable}
                onChange={(e) => handleChange('auto_enhance', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {enhancerUnavailable && (
            <p className="text-xs text-amber-700 mb-3">
              GEMINI_API_KEY is not configured on the server, so clean-up and translation are unavailable.
            </p>
          )}

          {/* Enhancement Prompt */}
          {options.auto_enhance && (
            <div>
              {/* Translation (performed by Gemini during clean-up) */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Translate To (optional)
                </label>
                <select
                  value={options.translate_to}
                  onChange={(e) => handleChange('translate_to', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No translation</option>
                  <option value="en">English</option>
                  <option value="ko">Korean</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="ja">Japanese</option>
                  <option value="zh">Chinese</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Gemini translates the cleaned-up transcript
                </p>
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Enhancement Prompt (optional)
              </label>
              <textarea
                value={options.enhancement_prompt}
                onChange={(e) => handleChange('enhancement_prompt', e.target.value)}
                placeholder="e.g., Focus on technical terms and improve structure..."
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Custom instructions for enhancement
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
