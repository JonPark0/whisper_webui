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
