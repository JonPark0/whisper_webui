import { useEffect, useState } from 'react';
import { apiService } from '../services/api';

// Fetched once per page load and shared by every caller.
let infoPromise = null;

export const useEngineInfo = () => {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!infoPromise) {
      infoPromise = apiService.getInfo().catch(() => {
        infoPromise = null;
        return null;
      });
    }
    let active = true;
    infoPromise.then((data) => {
      if (active) setInfo(data);
    });
    return () => {
      active = false;
    };
  }, []);

  return info;
};

// "faster-whisper · large-v3-turbo" — the repo id trimmed to the model name.
export const engineLabel = (info) => {
  if (!info?.engine) return '';
  const model = info.model ? info.model.split('/').pop().replace(/^faster-whisper-|-ct2$/g, '') : '';
  if (!model) return info.engine;
  // "Qwen3-ASR-1.7B" already names the engine; don't repeat it.
  return model.toLowerCase().includes(info.engine.toLowerCase()) ? model : `${info.engine} · ${model}`;
};
