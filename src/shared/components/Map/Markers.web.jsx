import React from 'react';
import { View, Text } from 'react-native';

const MockMarker = ({ title, children }) => (
  <View style={{ padding: 5, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 5, margin: 5 }}>
    <Text style={{ fontSize: 10, fontWeight: 'bold' }}>📍 {title || 'Marker'}</Text>
    {children}
  </View>
);

export const IncidentMarker = MockMarker;
export const AmbulanceMarker = MockMarker;
export const ResidentMarker = MockMarker;
export const ResponderMarker = MockMarker;
