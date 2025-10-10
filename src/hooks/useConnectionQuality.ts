import { useState, useEffect } from 'react';
import { logger } from '@/services/logger';

interface ConnectionStats {
  latency: number;
  packetsLost: number;
  jitter: number;
  timestamp: number;
}

interface UseConnectionQualityOptions {
  onQualityChange?: (quality: 'good' | 'fair' | 'poor') => void;
  sampleInterval?: number;
}

export const useConnectionQuality = (
  isConnected: boolean,
  options: UseConnectionQualityOptions = {}
) => {
  const [quality, setQuality] = useState<'good' | 'fair' | 'poor'>('good');
  const [stats, setStats] = useState<ConnectionStats[]>([]);
  
  const sampleInterval = options.sampleInterval || 5000; // 5 seconds default

  useEffect(() => {
    if (!isConnected) return;

    const collectStats = async () => {
      try {
        // Get RTCPeerConnection stats
        // This is a simplified example - implement actual WebRTC stats collection
        const currentStats: ConnectionStats = {
          latency: Math.random() * 200, // Simulate latency between 0-200ms
          packetsLost: Math.floor(Math.random() * 10),
          jitter: Math.random() * 50,
          timestamp: Date.now()
        };

        setStats(prev => [...prev.slice(-10), currentStats]); // Keep last 10 samples

        // Calculate quality based on stats
        const newQuality = calculateQuality(currentStats);
        if (newQuality !== quality) {
          setQuality(newQuality);
          options.onQualityChange?.(newQuality);
          
          if (newQuality === 'poor') {
            logger.warn('Poor connection quality detected', currentStats);
          }
        }
      } catch (error) {
        logger.error('Error collecting connection stats', { error });
      }
    };

    const interval = setInterval(collectStats, sampleInterval);
    return () => clearInterval(interval);
  }, [isConnected, quality, sampleInterval]);

  const calculateQuality = (stats: ConnectionStats): 'good' | 'fair' | 'poor' => {
    // Simple quality calculation based on thresholds
    // Customize these thresholds based on your requirements
    if (stats.latency > 150 || stats.packetsLost > 5 || stats.jitter > 30) {
      return 'poor';
    } else if (stats.latency > 100 || stats.packetsLost > 2 || stats.jitter > 20) {
      return 'fair';
    }
    return 'good';
  };

  return {
    quality,
    stats: stats[stats.length - 1], // Latest stats
    history: stats // Full history for analysis
  };
};