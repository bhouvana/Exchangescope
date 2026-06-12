import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetOrderBookQueryKey, getGetMarketStatsQueryKey } from '@workspace/api-client-react';

interface MarketSocketContextType {
  isConnected: boolean;
}

const MarketSocketContext = createContext<MarketSocketContextType>({ isConnected: false });

export const useMarketSocket = () => useContext(MarketSocketContext);

export const MarketSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onclose = () => {
        setIsConnected(false);
        const timeout = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;
        reconnectTimeoutRef.current = setTimeout(connect, timeout);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'orderbook':
              if (message.data?.symbol) {
                queryClient.setQueryData(getGetOrderBookQueryKey(message.data.symbol), message.data);
              }
              break;
            case 'stats':
              queryClient.setQueryData(getGetMarketStatsQueryKey(), message.data);
              break;
            // Handle other event types if needed
          }
        } catch (err) {
          console.error('Error parsing WS message', err);
        }
      };

      socketRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket', error);
      const timeout = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      reconnectAttemptsRef.current++;
      reconnectTimeoutRef.current = setTimeout(connect, timeout);
    }
  }, [queryClient]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  return (
    <MarketSocketContext.Provider value={{ isConnected }}>
      {children}
    </MarketSocketContext.Provider>
  );
};
