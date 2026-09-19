import React, { useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';

interface SignaturePadProps {
  onOK: (signature: string) => void;
  onEmpty: () => void;
  descriptionText?: string;
  clearText?: string;
  confirmText?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ 
  onOK, 
  onEmpty, 
  descriptionText = 'Sign here',
  clearText = 'Clear',
  confirmText = 'Save'
}) => {
  const ref = useRef<any>(null);

  const handleOK = (signature: string) => {
    onOK(signature); // Base64 string
  };

  const handleEmpty = () => {
    onEmpty();
  };

  const handleClear = () => {
    ref.current?.clearSignature();
  };

  const handleConfirm = () => {
    ref.current?.readSignature();
  };

  const webStyle = `
    .m-signature-pad {
      box-shadow: none; border: none;
    }
    .m-signature-pad--body { border: 1px solid #e2e8f0; border-radius: 8px; }
    .m-signature-pad--footer { display: none; margin: 0px; }
    body,html { height: 100%; width: 100%; margin: 0; padding: 0; }
  `;

  return (
    <View style={styles.container}>
      <Text style={styles.description}>{descriptionText}</Text>
      <View style={styles.padContainer}>
        <SignatureScreen
          ref={ref}
          onOK={handleOK}
          onEmpty={handleEmpty}
          webStyle={webStyle}
          autoClear={false}
          imageType="image/png"
        />
      </View>
      <View style={styles.buttonContainer}>
        <Text style={styles.button} onPress={handleClear}>{clearText}</Text>
        <Text style={styles.buttonPrimary} onPress={handleConfirm}>{confirmText}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 10,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '500',
  },
  padContainer: {
    height: 200,
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 15,
  },
  button: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  buttonPrimary: {
    color: '#fff',
    backgroundColor: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    overflow: 'hidden',
  }
});
