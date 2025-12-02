import { useState, useRef } from 'react';
import { apiService } from '../services/api';

export const AudioUploader = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [currentFile, setCurrentFile] = useState(null);
  const [queuedFiles, setQueuedFiles] = useState([]);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    const allowedExtensions = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    return allowedExtensions.includes(fileExtension);
  };

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;

    // Convert FileList to Array
    const fileArray = Array.from(files);

    // Validate all files
    const invalidFiles = fileArray.filter(file => !validateFile(file));
    if (invalidFiles.length > 0) {
      setError(`Unsupported file format in: ${invalidFiles.map(f => f.name).join(', ')}`);
      return;
    }

    setError(null);

    // Process files sequentially
    for (const file of fileArray) {
      await uploadSingleFile(file);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadSingleFile = async (file) => {
    setCurrentFile(file.name);
    setUploading(true);
    setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

    try {
      const result = await apiService.uploadAudio(file, (progress) => {
        setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
      });

      if (onUploadSuccess) {
        onUploadSuccess(result);
      }

      setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
    } catch (err) {
      setError(`${file.name}: ${err.response?.data?.detail || err.message || 'Upload failed'}`);
      throw err;
    } finally {
      setUploading(false);
      setCurrentFile(null);
      // Clean up progress after a delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
      }, 2000);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
  };

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".mp3,.wav,.flac,.aac,.ogg,.m4a,.wma"
          onChange={handleChange}
          disabled={uploading}
          multiple
        />

        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-gray-100">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>

          <div>
            <p className="text-lg font-medium text-gray-700">
              {uploading ? `Uploading ${currentFile}...` : 'Drop audio files here or click to browse'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Supports MP3, WAV, FLAC, AAC, OGG, M4A, WMA (multiple files supported)
            </p>
          </div>

          {uploading && currentFile && (
            <div className="w-full max-w-md mx-auto">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress[currentFile] || 0}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">{uploadProgress[currentFile] || 0}%</p>
            </div>
          )}

          {Object.keys(uploadProgress).length > 0 && !uploading && (
            <div className="w-full max-w-md mx-auto space-y-2">
              {Object.entries(uploadProgress).map(([filename, progress]) => (
                <div key={filename} className="text-xs text-gray-600">
                  <div className="flex justify-between mb-1">
                    <span className="truncate max-w-[200px]">{filename}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div
                      className="bg-green-600 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};
