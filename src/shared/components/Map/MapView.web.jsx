import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const MapView = forwardRef(({ children, style, ...props }, ref) => {
  return (
    <View style={[StyleSheet.absoluteFill, style, { backgroundColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ fontWeight: 'bold', color: '#475569', marginBottom: 10 }}>[ Live GPS Map Placeholder ]</Text>
      <Text style={{ color: '#475569', fontSize: 12 }}>Map rendering is disabled on Web.</Text>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {children}
      </View>
    </View>
  );
});

export default MapView;
