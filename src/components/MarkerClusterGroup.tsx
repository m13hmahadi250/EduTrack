import { useEffect, useState, ReactNode } from 'react';
import { useLeafletContext, LeafletContext } from '@react-leaflet/core';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

interface MarkerClusterGroupProps {
  children?: ReactNode;
  showCoverageOnHover?: boolean;
  spiderfyOnMaxZoom?: boolean;
  chunkedLoading?: boolean;
  maxClusterRadius?: number;
  disableClusteringAtZoom?: number;
  animate?: boolean;
}

export default function MarkerClusterGroup({ children, ...options }: MarkerClusterGroupProps) {
  const context = useLeafletContext();
  const [clusterGroup, setClusterGroup] = useState<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    // @ts-ignore
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      chunkedLoading: true,
      maxClusterRadius: 45,
      ...options,
    });

    const parentContainer = context.layerContainer || context.map;
    parentContainer.addLayer(group);
    setClusterGroup(group);

    return () => {
      // @ts-ignore
      if (group && typeof group.clearLayers === 'function') {
        // @ts-ignore
        group.clearLayers();
      }
      parentContainer.removeLayer(group);
    };
  }, [context.layerContainer, context.map, JSON.stringify(options)]);

  if (!clusterGroup) {
    return null;
  }

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
