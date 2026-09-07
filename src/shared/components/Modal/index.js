import React from 'react';
import { View, Text, Modal as RNModal } from 'react-native';
import { Button } from '../Button';

export function Modal({ visible, onClose, title, message, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel', type = 'info', className = '' }) {
  const confirmVariant = type === 'danger' ? 'danger' : 'primary';

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-center items-center px-4">
        <View className={`bg-white rounded-2xl p-6 w-full max-w-sm ${className}`}>
          <Text className="text-xl font-bold text-slate-900 mb-2">{title}</Text>
          <Text className="text-base text-slate-600 mb-6">{message}</Text>
          
          <View className="flex-row justify-end space-x-3">
            {onClose && (
              <Button 
                title={cancelText} 
                variant="ghost" 
                onPress={onClose} 
                className="flex-1"
              />
            )}
            {onConfirm && (
              <Button 
                title={confirmText} 
                variant={confirmVariant} 
                onPress={onConfirm} 
                className="flex-1"
              />
            )}
          </View>
        </View>
      </View>
    </RNModal>
  );
}
