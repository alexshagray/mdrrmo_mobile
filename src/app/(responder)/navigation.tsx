import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter as useExpoRouter, useLocalSearchParams as useExpoSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { MapView } from '@/shared/components/Map';
import MapboxGL from '@rnmapbox/maps';
import { ArrowLeft, Navigation, X, Crosshair, AlertTriangle, Layers, Map as MapIcon, Ambulance, CheckCircle } from 'lucide-react-native';
import { useLiveDispatchTracking } from '@/shared/hooks';
import { updateDispatchStatus } from '@/shared/api/dispatches';

// Helper: Haversine distance between two coords in meters
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Decode OSRM polyline
const decodePolyline = (str: string, precision: number = 5) => {
  let index = 0, lat = 0, lng = 0, coordinates = [], shift = 0, result = 0, byte = null, latitude_change, longitude_change, factor = Math.pow(10, precision);
  while (index < str.length) {
    byte = null; shift = 0; result = 0;
    do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
    shift = result = 0;
    do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += latitude_change; lng += longitude_change;
    coordinates.push({ latitude: lat / factor, longitude: lng / factor });
  }
  return coordinates;
};

export default function NavigationScreen() {
  const router = useExpoRouter();
  const params = useExpoSearchParams();
  const mapRef = useRef<MapboxGL.Camera>(null);

  const destination = {
    latitude: parseFloat(Array.isArray(params.lat) ? params.lat[0] : params.lat as string) || 8.5138,
    longitude: parseFloat(Array.isArray(params.lng) ? params.lng[0] : params.lng as string) || 124.5775,
  };

  const dispatchId = Array.isArray(params.dispatchId) ? params.dispatchId[0] : params.dispatchId;
  const [trackingStatus, setTrackingStatus] = useState('en_route');
  useLiveDispatchTracking(dispatchId, trackingStatus);

  const [isArriving, setIsArriving] = useState(false);

  const handleArrived = async () => {
    if (isArriving) return;
    setIsArriving(true);
    try {
      if (dispatchId) {
        await updateDispatchStatus(dispatchId, 'arrived_on_scene');
      }
      // Stop en-route tracking and route display
      setTrackingStatus('arrived_on_scene');
      setRouteCoords([]);
      setRouteInfo(null);

      // Automatically return to Home/Dashboard
      router.replace('/(responder)');
    } catch (e: any) {
      console.error('Error updating status to arrived_on_scene:', e);
      router.replace('/(responder)');
    } finally {
      setIsArriving(false);
    }
  };

  const [location, setLocation] = useState<Location.LocationObjectCoords | {latitude: number; longitude: number; heading: number} | null>(null);
  const [routeCoords, setRouteCoords] = useState<{latitude: number; longitude: number}[]>([]);
  const [routeInfo, setRouteInfo] = useState<{distance: string; duration: string} | null>(null);
  const [isCalculating, setIsCalculating] = useState(true);
  
  const [isFpvMode, setIsFpvMode] = useState(false);
  const isFpvModeRef = useRef(false);

  // Fetch Route from OSRM
  const fetchRoute = async (startLat: number, startLng: number, destLat: number, destLng: number) => {
    try {
      setIsCalculating(true);
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords = decodePolyline(route.geometry);
        setRouteCoords(coords);
        setRouteInfo({
          distance: (route.distance / 1000).toFixed(1) + ' km',
          duration: Math.ceil(route.duration / 60) + ' min',
        });
        
        if (mapRef.current && !isFpvModeRef.current) {
          const lats = [startLat, ...coords.map(c => c.latitude), destLat];
          const lngs = [startLng, ...coords.map(c => c.longitude), destLng];
          const ne = [Math.max(...lngs), Math.max(...lats)];
          const sw = [Math.min(...lngs), Math.min(...lats)];
          mapRef.current.fitBounds(ne, sw, [100, 50, 300, 50], 1000);
        }
      }
    } catch (e) {
      console.error("OSRM Routing Error", e);
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    const startTracking = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) {
            Alert.alert('Permission Denied', 'Location permission is required for navigation.');
            router.back();
          }
          return;
        }

        let isFirstLocation = true;

        const lastKnown = await Location.getLastKnownPositionAsync();
        if (!isMounted) return;

        if (lastKnown) {
          setLocation(lastKnown.coords);
          fetchRoute(lastKnown.coords.latitude, lastKnown.coords.longitude, destination.latitude, destination.longitude);
          isFirstLocation = false;
        } else {
          const fallbackLoc = { latitude: 8.5138, longitude: 124.5775, heading: 0 };
          setLocation(fallbackLoc);
          fetchRoute(fallbackLoc.latitude, fallbackLoc.longitude, destination.latitude, destination.longitude);
          isFirstLocation = false;
        }

        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 3000,
            distanceInterval: 10,
          },
          (loc) => {
            if (!isMounted) return;
            setLocation(loc.coords);
            
            if (isFpvModeRef.current && mapRef.current) {
               mapRef.current.setCamera({
                 centerCoordinate: [loc.coords.longitude, loc.coords.latitude],
                 heading: loc.coords.heading || 0,
                 pitch: 65,
                 zoomLevel: 19,
                 animationDuration: 3000
               });
            }
            
            if (isFirstLocation) {
              isFirstLocation = false;
              fetchRoute(loc.coords.latitude, loc.coords.longitude, destination.latitude, destination.longitude);
            } else {
              checkDeviationAndRecalculate(loc.coords);
            }
          }
        );

        if (isMounted) {
          locationSubscription = sub;
        } else {
          sub.remove();
        }
      } catch (err) {
        console.error("Location Tracking Error:", err);
      }
    };

    startTracking();

    return () => {
      isMounted = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  const checkDeviationAndRecalculate = (currentCoords: {latitude: number; longitude: number}) => {
    setRouteCoords((prevCoords) => {
      if (prevCoords.length === 0) return prevCoords;
      
      let minDistance = Infinity;
      for (const pt of prevCoords) {
        const d = getDistance(currentCoords.latitude, currentCoords.longitude, pt.latitude, pt.longitude);
        if (d < minDistance) minDistance = d;
      }
      
      if (minDistance > 50) {
        fetchRoute(currentCoords.latitude, currentCoords.longitude, destination.latitude, destination.longitude);
      }
      return prevCoords;
    });
  };

  const handleOverview = () => {
    isFpvModeRef.current = false;
    setIsFpvMode(false);
    
    if (mapRef.current && routeCoords.length > 0 && location) {
      const lats = [location.latitude, ...routeCoords.map(c => c.latitude), destination.latitude];
      const lngs = [location.longitude, ...routeCoords.map(c => c.longitude), destination.longitude];
      const ne = [Math.max(...lngs), Math.max(...lats)];
      const sw = [Math.min(...lngs), Math.min(...lats)];
      mapRef.current.fitBounds(ne, sw, [100, 50, 300, 50], 1000);
    }
  };

  const toggleFpv = () => {
    const newFpv = !isFpvModeRef.current;
    isFpvModeRef.current = newFpv;
    setIsFpvMode(newFpv);
    
    if (mapRef.current && location) {
      if (newFpv) {
        mapRef.current.setCamera({
          centerCoordinate: [location.longitude, location.latitude],
          pitch: 65,
          heading: location.heading || 0,
          zoomLevel: 19,
          animationDuration: 1000
        });
      } else {
        handleOverview();
      }
    }
  };

  return (
    <View className="flex-1 bg-slate-900 relative">
      <MapView 
        ref={mapRef}
        className="absolute inset-0"
        showsUserLocation={false} 
        styleURL={MapboxGL.StyleURL.Dark}
      >
        {routeCoords.length > 0 && (
          <MapboxGL.ShapeSource id="routeSource" shape={{ type: 'LineString', coordinates: routeCoords.map(c => [c.longitude, c.latitude]) }}>
            <MapboxGL.LineLayer id="routeFill" style={{ lineColor: '#34d399', lineWidth: 8, lineCap: 'round', lineJoin: 'round' }} />
          </MapboxGL.ShapeSource>
        )}
        
        {/* Noticeable Incident Destination Marker */}
        <MapboxGL.PointAnnotation id="incidentDestination" coordinate={[destination.longitude, destination.latitude]}>
          <View className="items-center justify-center w-24 h-24 bg-red-500/10 rounded-full">
            <View className="w-20 h-20 bg-red-500/20 rounded-full items-center justify-center absolute" />
            <View className="w-14 h-14 bg-red-500 rounded-full border-[4px] border-white shadow-2xl items-center justify-center">
              <AlertTriangle size={24} color="#ffffff" strokeWidth={2.5} />
            </View>
            <View className="absolute bottom-2 w-4 h-4 bg-red-600 rounded-full border-4 border-white shadow-sm" />
          </View>
        </MapboxGL.PointAnnotation>

        {/* Responder Navigation Puck */}
        {location && (
          <MapboxGL.PointAnnotation id="userPuck" coordinate={[location.longitude, location.latitude]}>
            <View className="items-center justify-center w-32 h-32 bg-emerald-500/20 rounded-full">
              <View className="w-24 h-24 bg-emerald-500/40 rounded-full items-center justify-center absolute border border-emerald-400/50" />
              <View className="w-16 h-16 bg-emerald-500 rounded-full border-[4px] border-white shadow-2xl items-center justify-center" style={{ elevation: 10, shadowColor: '#10B981', shadowOpacity: 0.8, shadowRadius: 15 }}>
                <View style={{ transform: [{ rotate: `${location.heading || 0}deg` }] }}>
                  <Navigation size={28} color="#ffffff" fill="#ffffff" />
                </View>
              </View>
            </View>
          </MapboxGL.PointAnnotation>
        )}
      </MapView>

      <SafeAreaView className="flex-1 justify-between" edges={['top', 'bottom']} pointerEvents="box-none">
        
        {/* Top Header */}
        <View className="px-4 mt-2 flex-row items-center" pointerEvents="box-none">
          <TouchableOpacity onPress={() => router.back()} className="bg-slate-900/90 p-3 rounded-full shadow-xl mr-3 border border-slate-700/50 pointer-events-auto">
            <ArrowLeft size={24} color="#f8fafc" />
          </TouchableOpacity>
          <View className="flex-1 bg-slate-900/90 py-3 px-5 rounded-3xl shadow-xl border border-slate-700/50 flex-row items-center pointer-events-auto">
             <View className="flex-1">
               <Text className="text-white font-bold text-lg tracking-tight">Responding to Scene</Text>
               {isCalculating ? (
                 <Text className="text-emerald-400/80 text-sm font-medium">Calculating fastest route...</Text>
               ) : (
                 <Text className="text-emerald-400/80 text-sm font-medium">Follow highlighted path</Text>
               )}
             </View>
          </View>
        </View>

        {/* Bottom Panel */}
        <View className="px-4 mb-4 flex-col items-end" pointerEvents="box-none">
          
          <View className="flex-col items-center mb-6 space-y-4" pointerEvents="box-none">
            {/* Overview Map Button */}
            <TouchableOpacity 
              onPress={handleOverview} 
              className={`w-14 h-14 rounded-full shadow-2xl items-center justify-center border pointer-events-auto mb-3 ${!isFpvMode ? 'bg-emerald-500 border-emerald-400' : 'bg-slate-900/90 border-slate-700/50'}`}
            >
              <MapIcon size={24} color={!isFpvMode ? '#ffffff' : '#94A3B8'} />
            </TouchableOpacity>

            {/* FPV Mode Toggle Button */}
            <TouchableOpacity 
              onPress={toggleFpv} 
              className={`w-14 h-14 rounded-full shadow-2xl items-center justify-center border pointer-events-auto ${isFpvMode ? 'bg-emerald-500 border-emerald-400' : 'bg-slate-900/90 border-slate-700/50'}`}
            >
              <Layers size={24} color={isFpvMode ? '#ffffff' : '#34d399'} />
            </TouchableOpacity>
          </View>

          {/* Info Card */}
          <View className="bg-slate-900/95 w-full rounded-[32px] p-6 shadow-2xl border border-slate-700/80 pointer-events-auto">
            {routeInfo ? (
              <View className="flex-row justify-between items-end mb-6">
                <View>
                  <Text className="text-6xl font-black text-emerald-400 tracking-tighter shadow-sm">{routeInfo.duration}</Text>
                  <Text className="text-slate-400 font-bold text-sm tracking-widest uppercase mt-1">{routeInfo.distance} remaining</Text>
                </View>
                <View className="bg-emerald-500/20 px-4 py-2 rounded-full border border-emerald-500/30">
                  <Text className="text-emerald-400 font-black text-xs tracking-widest">ACTIVE</Text>
                </View>
              </View>
            ) : (
              <View className="flex-row items-center justify-center py-6 mb-2">
                 <ActivityIndicator color="#34d399" size="large" />
                 <Text className="ml-4 text-slate-300 font-bold text-lg">Acquiring GPS...</Text>
              </View>
            )}

            <TouchableOpacity 
              onPress={handleArrived}
              disabled={isArriving}
              activeOpacity={0.85}
              style={styles.btnArrived}
            >
              {isArriving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <Ambulance size={22} color="#ffffff" style={{ marginRight: 10 }} />
                  <Text style={styles.btnArrivedText}>ARRIVED ON SCENE</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  btnArrived: {
    width: '100%',
    backgroundColor: '#059669',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  btnArrivedText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1.2,
  },
});
