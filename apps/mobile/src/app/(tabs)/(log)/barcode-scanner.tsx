/**
 * Barcode scanner screen using expo-camera.
 */
import { useState } from 'react';
import { View, Pressable, Alert, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { DotFuelColors, Spacing } from '@/constants/colors';
import { getApiUrl } from '@/lib/api-helper';

export default function BarcodeScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  if (!permission) return <View style={{ flex: 1, backgroundColor: DotFuelColors.black }} />;

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: DotFuelColors.black, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>📷</Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: DotFuelColors.white, textAlign: 'center', marginBottom: 8 }}>
          Camera Permission Required
        </Text>
        <Text style={{ fontSize: 13, color: DotFuelColors.muted, textAlign: 'center', marginBottom: 20, lineHeight: 20 }}>
          We need camera access to scan barcodes on food products.
        </Text>
        <Pressable
          onPress={requestPermission}
          style={({ pressed }) => ({
            backgroundColor: DotFuelColors.lime, borderRadius: 14,
            paddingVertical: 14, paddingHorizontal: 32,
            opacity: pressed ? 0.88 : 1,
          })}
        >
          <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '800', color: DotFuelColors.black }}>
            Grant Permission
          </Text>
        </Pressable>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    if (process.env.EXPO_OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const res = await fetch(getApiUrl(`/api/fatsecret?action=barcode&barcode=${data}`));
      const result = await res.json();
      const foodObj = result?.food;

      if (foodObj?.food_id) {
        // Match found! Fetch details to get exact servings and macros
        const detailRes = await fetch(getApiUrl(`/api/fatsecret?action=detail&food_id=${foodObj.food_id}`));
        const detailData = await detailRes.json();
        const foodDetail = detailData?.food || foodObj;
        
        const servingsObj = foodDetail?.servings?.serving;
        const serving = Array.isArray(servingsObj) ? servingsObj[0] : servingsObj;

        const calories = serving ? Math.round(parseFloat(serving.calories || '0')) : 0;
        const protein = serving ? Math.round(parseFloat(serving.protein || '0')) : 0;
        const carbs = serving ? Math.round(parseFloat(serving.carbohydrate || '0')) : 0;
        const fat = serving ? Math.round(parseFloat(serving.fat || '0')) : 0;
        const servingSize = serving ? (serving.serving_description || '1 serving') : '1 serving';

        const scannedFood = {
          name: foodDetail.food_name || 'Scanned Food',
          emoji: '📱',
          calories,
          protein_g: protein,
          carbs_g: carbs,
          fat_g: fat,
          serving_size: servingSize,
          source: 'barcode',
        };

        Alert.alert(
          'Product Found!',
          `${scannedFood.name}\n${calories} kcal • ${servingSize}`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setScanned(false) },
            { 
              text: 'Log Food', 
              onPress: () => {
                router.replace({
                  pathname: '/(tabs)/(log)',
                  params: { scannedFood: JSON.stringify(scannedFood) }
                });
              } 
            },
          ]
        );
      } else {
        Alert.alert('Not Found', `No product found for barcode ${data}. Try searching manually.`, [
          { text: 'OK', onPress: () => setScanned(false) },
        ]);
      }
    } catch (err: any) {
      console.error('[barcode] error:', err);
      Alert.alert('Error', 'Failed to look up barcode.', [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: DotFuelColors.black }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay */}
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        paddingTop: 60, paddingHorizontal: Spacing['2xl'], alignItems: 'center',
      }}>
        <Text style={{
          fontFamily: 'Inter', fontSize: 18, fontWeight: '900',
          color: DotFuelColors.white,
          textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
        }}>
          Scan Barcode
        </Text>
        <Text style={{
          fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4,
          textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
        }}>
          Point at a food product barcode
        </Text>
      </View>

      {/* Center guide */}
      <View style={{
        position: 'absolute', top: '35%', left: '10%', right: '10%',
        height: 200, borderRadius: 16,
        borderWidth: 2, borderColor: DotFuelColors.lime,
        borderStyle: 'dashed',
      }} />
    </View>
  );
}
