import React, { forwardRef } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import ENV from '@/shared/config/env';

// Initialize Mapbox with access token
MapboxGL.setAccessToken(ENV.MAPBOX_ACCESS_TOKEN);

export interface MapViewProps extends Omit<React.ComponentProps<typeof MapboxGL.MapView>, 'style'> {
  children?: React.ReactNode;
  initialRegion?: { latitude: number; longitude: number };
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export const MapView = forwardRef<MapboxGL.Camera, MapViewProps>(({ 
  children, 
  initialRegion,
  showsUserLocation = false,
  showsMyLocationButton = false,
  className,
  style,
  ...props 
}, ref) => {

  const defaultCenter = initialRegion ? [initialRegion.longitude, initialRegion.latitude] : [124.5775, 8.5138];
  
  return (
    <View style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', flex: 1 }, style]}>
      <MapboxGL.MapView
        style={{ flex: 1 }}
        styleURL={MapboxGL.StyleURL.Street}
        logoEnabled={false} // Clean UI, no logo spam (Mapbox allows this for paid/internal, but we can disable the large one)
        attributionEnabled={false}
        {...props}
      >
        <MapboxGL.Camera
          ref={ref}
          defaultSettings={{
            centerCoordinate: defaultCenter,
            zoomLevel: 14,
          }}
          zoomLevel={14}
          centerCoordinate={defaultCenter}
          animationMode="flyTo"
          animationDuration={2000}
        />
        {showsUserLocation && (
          <MapboxGL.UserLocation visible={true} showsUserHeadingIndicator={true} />
        )}
        {children}
      </MapboxGL.MapView>
    </View>
  );
});

export default MapView;
