import React from 'react';
import MapboxGL from '@rnmapbox/maps';
import { View } from 'react-native';
import { AlertTriangle, User, PlusSquare, Navigation } from 'lucide-react-native';

const isValidCoord = (coord) => {
  return coord && 
         typeof coord.longitude === 'number' && !isNaN(coord.longitude) &&
         typeof coord.latitude === 'number' && !isNaN(coord.latitude);
};

export const IncidentMarker = ({ coordinate, title, description, id = "incident-marker", ...props }) => {
  if (!isValidCoord(coordinate)) return null;
  return (
    <MapboxGL.PointAnnotation id={id} coordinate={[coordinate.longitude, coordinate.latitude]} title={title} {...props}>
      <View className="bg-red-500 p-2 rounded-full border-2 border-white shadow-md">
        <AlertTriangle size={20} color="#FFFFFF" />
      </View>
    </MapboxGL.PointAnnotation>
  );
};

export const AmbulanceMarker = ({ coordinate, title, description, ...props }) => {
  if (!isValidCoord(coordinate)) return null;
  return (
    <MapboxGL.PointAnnotation id="ambulance-marker" coordinate={[coordinate.longitude, coordinate.latitude]} title={title} {...props}>
      <View className="bg-blue-600 p-2 rounded-full border-2 border-white shadow-md">
        <PlusSquare size={20} color="#FFFFFF" />
      </View>
    </MapboxGL.PointAnnotation>
  );
};

export const ResidentMarker = ({ coordinate, title, ...props }) => {
  if (!isValidCoord(coordinate)) return null;
  return (
    <MapboxGL.PointAnnotation id="resident-marker" coordinate={[coordinate.longitude, coordinate.latitude]} title={title} {...props}>
      <View className="bg-amber-500 p-2 rounded-full border-2 border-white shadow-md">
        <User size={20} color="#FFFFFF" />
      </View>
    </MapboxGL.PointAnnotation>
  );
};

export const ResponderMarker = ({ coordinate, title, ...props }) => {
  if (!isValidCoord(coordinate)) return null;
  return (
    <MapboxGL.PointAnnotation id="responder-marker" coordinate={[coordinate.longitude, coordinate.latitude]} title={title} {...props}>
      <View className="bg-emerald-500 p-2 rounded-full border-2 border-white shadow-md">
        <Navigation size={20} color="#FFFFFF" />
      </View>
    </MapboxGL.PointAnnotation>
  );
};
