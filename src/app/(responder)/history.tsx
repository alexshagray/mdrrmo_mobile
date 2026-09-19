import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Header, SearchBar, StatusChip } from '@/shared/components';
import { MapPin, Calendar, Clock, User, Phone, Filter, X, ArrowLeft } from 'lucide-react-native';
import { getDispatchHistory } from '@/shared/api/dispatches';

const CATEGORIES = [
  { id: 'all', label: 'All History' },
  { id: '1', label: 'Medical' }, // Assuming 1 = Medical
  { id: '2', label: 'Trauma' },
  { id: '3', label: 'Fire' },
  { id: '4', label: 'Rescue' },
];

const getRecentDates = () => {
  const dates = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const formatted = `${year}-${month}-${day}`;
    
    let label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (i === 0) label = `Today (${label})`;
    else if (i === 1) label = `Yesterday (${label})`;
    
    dates.push({ value: formatted, label });
  }
  return dates;
};

export default function HistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaginating, setIsPaginating] = useState(false);
  
  const [activeCategory, setActiveCategory] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  useEffect(() => {
    loadHistory(1, activeCategory, filterDate);
  }, [activeCategory, filterDate]);

  const loadHistory = async (pageNum: number, type: string, date: string) => {
    try {
      if (pageNum === 1) setIsLoading(true);
      else setIsPaginating(true);

      const res = await getDispatchHistory(pageNum, type, date);
      
      if (pageNum === 1) {
        setHistory(res.data);
      } else {
        setHistory(prev => [...prev, ...res.data]);
      }
      
      setHasMore(res.next_page_url !== null);
      setPage(pageNum);
    } catch (e) {
      console.log('Failed to load history', e);
    } finally {
      setIsLoading(false);
      setIsPaginating(false);
    }
  };

  const handleLoadMore = () => {
    if (!isPaginating && hasMore) {
      loadHistory(page + 1, activeCategory, filterDate);
    }
  };

  const applyDateFilter = (date: string) => {
    setFilterDate(date);
    setIsFilterModalVisible(false);
  };

  const renderHistoryCard = (item: any) => (
    <View
      key={item.id}
      className="bg-white rounded-3xl p-5 border border-slate-200/80 mb-3.5"
      style={{
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 mr-2">
          <Text className="text-slate-900 font-bold text-base tracking-tight mb-0.5">{item.type}</Text>
          <Text className="text-slate-400 text-[10px] font-mono font-bold uppercase tracking-wider">{item.id}</Text>
        </View>
        <StatusChip status={item.status} type="dispatch" />
      </View>
      
      <View className="bg-slate-50 rounded-2xl p-3.5 mb-3.5 border border-slate-100 space-y-2">
        <View className="flex-row items-center">
          <User size={13} color="#2563EB" />
          <Text className="text-slate-700 ml-2 text-xs font-medium flex-1" numberOfLines={1}>
            <Text className="font-bold text-slate-900">Patient:</Text> {item.patient_name}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Phone size={13} color="#7C3AED" />
          <Text className="text-slate-700 ml-2 text-xs font-medium flex-1" numberOfLines={1}>
            <Text className="font-bold text-slate-900">Reporter:</Text> {item.reporter_name}
          </Text>
        </View>
        <View className="flex-row items-center">
          <MapPin size={13} color="#D97706" />
          <Text className="text-slate-500 ml-2 text-xs font-medium flex-1" numberOfLines={1}>
            {item.description || item.location}
          </Text>
        </View>
      </View>
      
      <View className="flex-row items-center justify-between px-0.5 pt-2 border-t border-slate-100">
        <View className="flex-row items-center">
          <Calendar size={13} color="#94A3B8" />
          <Text className="text-slate-400 ml-1.5 text-xs font-medium">{item.date}</Text>
        </View>
        <View className="flex-row items-center bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
          <Clock size={11} color="#2563EB" />
          <Text className="text-blue-700 ml-1.5 text-[11px] font-mono font-bold tracking-wider">{item.time}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
      {/* Top App Bar */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-slate-200/80 bg-white mb-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center border border-slate-200/80 active:bg-slate-200"
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color="#0F172A" />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-slate-900 text-base font-bold tracking-tight">Dispatch History</Text>
          <Text className="text-slate-400 text-xs">Past Missions & Logs</Text>
        </View>
        <TouchableOpacity 
          onPress={() => setIsFilterModalVisible(true)}
          className={`h-10 w-10 rounded-xl flex items-center justify-center border ${filterDate ? 'bg-blue-600 border-blue-600' : 'bg-slate-100 border-slate-200/80'}`}
        >
          <Filter size={16} color={filterDate ? '#FFFFFF' : '#64748B'} />
        </TouchableOpacity>
      </View>

      <View className="mb-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat.id}
              onPress={() => setActiveCategory(cat.id)}
              className={`mr-2 px-4 py-1.5 rounded-full border ${activeCategory === cat.id ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-200'}`}
            >
              <Text className={`font-bold text-xs ${activeCategory === cat.id ? 'text-white' : 'text-slate-600'}`}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView className="flex-1 px-5 pt-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {isLoading ? (
          <View className="py-16 items-center justify-center">
            <ActivityIndicator size="large" color="#2563EB" />
            <Text className="text-slate-400 text-sm mt-3">Loading mission history...</Text>
          </View>
        ) : history.length === 0 ? (
          <View className="py-12 items-center justify-center bg-white rounded-3xl border border-slate-200 p-8 mt-2">
            <View className="w-14 h-14 rounded-2xl bg-slate-100 items-center justify-center border border-slate-200 mb-3">
              <Filter size={24} color="#94A3B8" />
            </View>
            <Text className="text-slate-900 font-bold text-base mb-1">No Missions Found</Text>
            <Text className="text-slate-400 text-xs text-center">No past missions match your current filters.</Text>
            {(activeCategory !== 'all' || filterDate !== '') && (
              <TouchableOpacity onPress={() => { setActiveCategory('all'); setFilterDate(''); }} className="mt-4 bg-slate-100 px-5 py-2.5 rounded-xl border border-slate-200">
                <Text className="text-slate-700 font-bold text-xs">Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {history.map(renderHistoryCard)}
            
            {hasMore && (
              <TouchableOpacity 
                onPress={handleLoadMore}
                disabled={isPaginating}
                className="bg-white py-3.5 rounded-2xl items-center justify-center mb-8 border border-slate-200 flex-row active:bg-slate-50"
              >
                {isPaginating ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <Text className="text-slate-700 font-bold text-xs tracking-wider">LOAD MORE MISSIONS</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={isFilterModalVisible} transparent animationType="slide">
        <View className="flex-1 justify-end bg-slate-900/40">
          <View className="bg-white rounded-t-[32px] p-6 pb-12 shadow-2xl">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-slate-900 font-bold text-xl tracking-tight">Filter History</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)} className="bg-slate-100 p-2 rounded-full">
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-3">Filter by Date</Text>
            <View className="space-y-2.5 mb-6">
              {getRecentDates().map(dateObj => (
                <TouchableOpacity key={dateObj.value} onPress={() => applyDateFilter(dateObj.value)} className={`p-3.5 rounded-2xl border ${filterDate === dateObj.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                  <Text className={`font-bold text-xs ${filterDate === dateObj.value ? 'text-blue-700' : 'text-slate-700'}`}>{dateObj.label}</Text>
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity onPress={() => applyDateFilter('')} className={`p-3.5 rounded-2xl border ${filterDate === '' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                <Text className={`font-bold text-xs ${filterDate === '' ? 'text-blue-700' : 'text-slate-700'}`}>Any Date</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={() => setIsFilterModalVisible(false)}
              className="bg-slate-900 py-3.5 rounded-2xl items-center active:bg-slate-800"
            >
              <Text className="text-white font-bold text-sm tracking-wider">APPLY FILTERS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal> 
    </SafeAreaView>
  );
}
