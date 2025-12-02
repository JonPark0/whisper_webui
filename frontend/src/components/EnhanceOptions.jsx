import { useState } from 'react';

export const EnhanceOptions = ({ onChange }) => {
  const [options, setOptions] = useState({
    translate_to: '',
    enhancement_prompt: '',
  });

  const handleChange = (key, value) => {
    const newOptions = { ...options, [key]: value };
    setOptions(newOptions);
    if (onChange) {
      onChange(newOptions);
    }
  };

  return (
    <div className="w-full p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Enhancement Options</h3>

      <div className="space-y-4">
        {/* Translation */}
        <div>
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
            Translate transcript to target language during enhancement
          </p>
        </div>

        {/* Custom Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Enhancement Prompt (optional)
          </label>
          <textarea
            value={options.enhancement_prompt}
            onChange={(e) => handleChange('enhancement_prompt', e.target.value)}
            placeholder="e.g., Focus on technical accuracy and improve sentence structure..."
            rows="5"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            Provide custom instructions for Gemini AI to enhance the transcript
          </p>
        </div>

        {/* Enhancement Info */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">
            What does enhancement do?
          </h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Grammar and punctuation correction</li>
            <li>• Improved sentence structure and readability</li>
            <li>• Technical term correction based on context</li>
            <li>• Removal of excessive filler words</li>
            <li>• Better formatting with headings and structure</li>
            <li>• Optional translation to target language</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
