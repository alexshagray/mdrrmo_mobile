import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header, SearchBar, StatusChip } from '@/shared/components';
import { MapPin, Calendar, Clock, User, Phone, Filter, X } from 'lucide-react-native';
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
    <View key={item.id} className="bg-white rounded-[28px] p-5 border border-slate-100 mb-4 overflow-hidden relative" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}>
      {/* Decorative side accent */}
      <View className={`absolute left-0 top-0 bottom-0 w-[4px] ${item.status.toLowerCase() === 'completed' ? 'bg-green-500' : 'bg-slate-300'}`} />
      
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-1">
          <Text className="text-slate-900 font-black text-xl tracking-tight mb-1">{item.type}</Text>
          <Text className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{item.id}</Text>
        </View>
        <StatusChip status={item.status} type="dispatch" />
      </View>
      
      <View className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-100 space-y-3">
        <View className="flex-row items-center">
          <User size={14} color="#3B82F6" />
          <Text className="text-slate-700 ml-2 text-sm font-medium flex-1" numberOfLines={1}>
            <Text className="font-bold">Patient:</Text> {item.patient_name}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Phone size={14} color="#8B5CF6" />
          <Text className="text-slate-700 ml-2 text-sm font-medium flex-1" numberOfLines={1}>
            <Text className="font-bold">Reporter:</Text> {item.reporter_name}
          </Text>
        </View>
        <View className="flex-row items-center">
          <MapPin size={14} color="#F59E0B" />
          <Text className="text-slate-600 ml-2 text-sm font-medium flex-1" numberOfLines={1}>
            {item.description || item.location}
          </Text>
        </View>
      </View>
      
      <View className="flex-row items-center justify-between px-1">
        <View className="flex-row items-center">
          <Calendar size={14} color="#94A3B8" />
          <Text className="text-slate-500 ml-1.5 text-xs font-bold tracking-tight">{item.date}</Text>
        </View>
        <View className="flex-row items-center bg-blue-50 px-3 py-1 rounded-full">
          <Clock size={12} color="#3B82F6" />
          <Text className="text-blue-700 ml-1.5 text-xs font-black tracking-widest">{item.time}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* <Header title="Mission History" subtitle="PAST DISPATCHES & PCRs" showBack={false} /> */}
      
      <View className="px-5 mb-4 flex-row items-center space-x-2">
        <View className="flex-1">
          {/* <SearchBar placeholder="Search by ID or Patient..." /> */}
        </View>
        <TouchableOpacity 
          onPress={() => setIsFilterModalVisible(true)}
          className={`h-12 w-12 rounded-2xl flex items-center justify-center border ${filterDate ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}
        >
          <Filter size={20} color={filterDate ? '#FFFFFF' : '#64748B'} />
        </TouchableOpacity>
      </View>

      <View className="mb-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat.id}
              onPress={() => setActiveCategory(cat.id)}
              className={`mr-2 px-5 py-2.5 rounded-full border ${activeCategory === cat.id ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-200'}`}
            >
              <Text className={`font-black text-xs tracking-widest uppercase ${activeCategory === cat.id ? 'text-white' : 'text-slate-500'}`}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView className="flex-1 px-5 pt-2" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {isLoading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text>Loading...</Text>
          </View>
        ) : history.length === 0 ? (
          <View className="py-10 items-center justify-center bg-white rounded-[28px] border border-slate-100 p-8" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}>
            <Text className="text-slate-800 font-black text-xl mb-2">No History Found</Text>
            <Text className="text-slate-500 text-center">No past missions match your current filters.</Text>
            {(activeCategory !== 'all' || filterDate !== '') && (
              <TouchableOpacity onPress={() => { setActiveCategory('all'); setFilterDate(''); }} className="mt-4 bg-slate-100 px-6 py-3 rounded-xl">
                <Text className="text-slate-700 font-bold">Clear Filters</Text>
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
                className="bg-slate-200 py-4 rounded-2xl items-center justify-center mb-8 border border-slate-300 flex-row"
              >
                {isPaginating ? (
                  <ActivityIndicator size="small" color="#64748B" />
                ) : (
                  <Text className="text-slate-600 font-black tracking-widest text-xs">LOAD MORE HISTORY</Text>
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
              <Text className="text-slate-900 font-black text-2xl tracking-tighter">Filter History</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)} className="bg-slate-100 p-2 rounded-full">
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-3">Filter by Date</Text>
            <View className="space-y-3 mb-8">
              {getRecentDates().map(dateObj => (
                <TouchableOpacity key={dateObj.value} onPress={() => applyDateFilter(dateObj.value)} className={`p-4 rounded-2xl border ${filterDate === dateObj.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                  <Text className={`font-bold ${filterDate === dateObj.value ? 'text-blue-700' : 'text-slate-700'}`}>{dateObj.label}</Text>
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity onPress={() => applyDateFilter('')} className={`p-4 rounded-2xl border ${filterDate === '' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                <Text className={`font-bold ${filterDate === '' ? 'text-blue-700' : 'text-slate-700'}`}>Any Date</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={() => setIsFilterModalVisible(false)}
              className="bg-blue-600 py-4 rounded-2xl items-center shadow-lg shadow-blue-500/30"
            >
              <Text className="text-white font-black tracking-widest">APPLY FILTERS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal> 
    </SafeAreaView>
  );
}
