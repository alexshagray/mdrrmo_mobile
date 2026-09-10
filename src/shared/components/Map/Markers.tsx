import React from 'react';
import MapboxGL from '@rnmapbox/maps';
import { View } from 'react-native';
import { AlertTriangle, User, PlusSquare, Navigation } from 'lucide-react-native';

export interface MarkerCoordinate {
  latitude: number;
  longitude: number;
}

export interface MarkerProps {
  coordinate: MarkerCoordinate;
  title?: string;
  description?: string;
  id?: string;
  [key: string]: any;
}

const isValidCoord = (coord?: MarkerCoordinate | null): coord is MarkerCoordinate => {
  return !!(
    coord &&
    typeof coord.longitude === 'number' &&
    !isNaN(coord.longitude) &&
    typeof coord.latitude === 'number' &&
    !isNaN(coord.latitude)
  );
};

export const IncidentMarker: React.FC<MarkerProps> = ({
  coordinate,
  title,
  description,
  id = 'incident-marker',
  ...props
}) => {
  if (!isValidCoord(coordinate)) return null;
  return (
    <MapboxGL.PointAnnotation id={id} coordinate={[coordinate.longitude, coordinate.latitude]} title={title} {...props}>
      <View className="bg-red-500 p-2 rounded-full border-2 border-white shadow-md">
        <AlertTriangle size={20} color="#FFFFFF" />
      </View>
    </MapboxGL.PointAnnotation>
  );
};

export const AmbulanceMarker: React.FC<MarkerProps> = ({
  coordinate,
  title,
  description,
  id = 'ambulance-marker',
  ...props
}) => {
  if (!isValidCoord(coordinate)) return null;
  return (
    <MapboxGL.PointAnnotation id={id} coordinate={[coordinate.longitude, coordinate.latitude]} title={title} {...props}>
      <View className="bg-blue-600 p-2 rounded-full border-2 border-white shadow-md">
        <PlusSquare size={20} color="#FFFFFF" />
      </View>
    </MapboxGL.PointAnnotation>
  );
};

export const ResidentMarker: React.FC<MarkerProps> = ({
  coordinate,
  title,
  description,
  id = 'resident-marker',
  ...props
}) => {
  if (!isValidCoord(coordinate)) return null;
  return (
    <MapboxGL.PointAnnotation id={id} coordinate={[coordinate.longitude, coordinate.latitude]} title={title} {...props}>
      <View className="bg-amber-500 p-2 rounded-full border-2 border-white shadow-md">
        <User size={20} color="#FFFFFF" />
      </View>
    </MapboxGL.PointAnnotation>
  );
};

export const ResponderMarker: React.FC<MarkerProps> = ({
  coordinate,
  title,
  description,
  id = 'responder-marker',
  ...props
}) => {
  if (!isValidCoord(coordinate)) return null;
  return (
    <MapboxGL.PointAnnotation id={id} coordinate={[coordinate.longitude, coordinate.latitude]} title={title} {...props}>
      <View className="bg-emerald-500 p-2 rounded-full border-2 border-white shadow-md">
        <Navigation size={20} color="#FFFFFF" />
      </View>
    </MapboxGL.PointAnnotation>
  );
};
