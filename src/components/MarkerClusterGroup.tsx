import { useEffect, useRef, ReactNode } from 'react';
import { useLeafletContext, LeafletContext } from '@react-leaflet/core';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

interface MarkerClusterGroupProps {
  children?: ReactNode;
}

export default function MarkerClusterGroup({ children }: MarkerClusterGroupProps) {
  const context = useLeafletContext();
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  if (!clusterGroupRef.current) {
    // @ts-ignore
    clusterGroupRef.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      chunkedLoading: true,
      maxClusterRadius: 45,
    });
  }

  const clusterGroup = clusterGroupRef.current;

  useEffect(() => {
    const parentContainer = (context.layerContainer || context.map) as any;
    
    if (parentContainer && typeof parentContainer.addLayer === 'function') {
      parentContainer.addLayer(clusterGroup);
    }

    return () => {
      if (clusterGroup) {
        clusterGroup.clearLayers();
      }
      if (parentContainer) {
        if (typeof parentContainer.hasLayer === 'function' && parentContainer.hasLayer(clusterGroup)) {
          parentContainer.removeLayer(clusterGroup);
        } else if (typeof parentContainer.removeLayer === 'function') {
          try {
            parentContainer.removeLayer(clusterGroup);
          } catch (e) {
            // Safe fallback if already dropped during parent destruction
          }
        }
      }
    };
  }, [context.layerContainer, context.map, clusterGroup]);

  const newContext = {
    ...context,
    layerContainer: clusterGroup,
  };

  return (
    <LeafletContext.Provider value={newContext}>
      {children}
    </LeafletContext.Provider>
  );
}
