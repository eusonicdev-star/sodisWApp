import React, {useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Vibration,
} from 'react-native';
import {Camera} from 'react-native-camera-kit';

interface Props {
  onScanned: (value: string) => void;
  onClose: () => void;
}

const {width, height} = Dimensions.get('window');

const SCAN_BOX_WIDTH = width * 0.8;
const SCAN_BOX_HEIGHT = 180;

export default function BarcodeScanZxing({onScanned, onClose}: Props) {
  const scannedRef = useRef(false);
  const candidateRef = useRef<string | null>(null);
  const confirmTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [matchCount, setMatchCount] = useState(0);

  return (
    <View style={styles.container}>
      {/* 📷 ZXing Camera */}
      <Camera
        style={StyleSheet.absoluteFill}
        // 🔥 ZXing 스캔 활성화 (핵심)
        scanBarcode={true}
        // 🔥 스캔 결과 콜백
        onReadCode={(event: any) => {
          const value = event?.nativeEvent?.codeStringValue;
          if (!value || scannedRef.current) return;

          const trimmed = value.trim();

          // 🔹 아직 후보가 없으면 첫 후보 등록
          if (candidateRef.current === null) {
            candidateRef.current = trimmed;
            setMatchCount(1);

            confirmTimerRef.current = setTimeout(() => {
              scannedRef.current = true;
              Vibration.vibrate(60);
              onScanned(trimmed);
              onClose();
            }, 800); // ← 핵심 타이밍

            return;
          }

          // 🔹 다른 값이 들어오면 → 처음 값이 틀렸다고 판단
          if (candidateRef.current !== trimmed) {
            candidateRef.current = trimmed;
            setMatchCount(1);

            if (confirmTimerRef.current) {
              clearTimeout(confirmTimerRef.current);
            }

            confirmTimerRef.current = setTimeout(() => {
              scannedRef.current = true;
              Vibration.vibrate(60);
              onScanned(trimmed);
              onClose();
            }, 800);
          }

          // 🔹 같은 값이면 그냥 유지 (카운트는 UX용)
          else {
            setMatchCount(1); // 유지 중 표시
          }
        }}
      />
      <View style={styles.counterContainer}>
        <Text style={styles.counterText}>{matchCount} / 2</Text>
      </View>

      {/* 🎯 ZXing 스타일 오버레이 */}
      <View style={StyleSheet.absoluteFill}>
        {/* 상단 마스크 */}
        <View style={[styles.mask, {height: (height - SCAN_BOX_HEIGHT) / 2}]} />

        <View style={styles.middleRow}>
          <View style={styles.mask} />

          {/* 스캔 영역 */}
          <View style={styles.scanBox}>
            {/* 가로 빨간 라인 */}
            <View style={styles.scanLine} />
          </View>

          <View style={styles.mask} />
        </View>

        {/* 하단 마스크 */}
        <View style={[styles.mask, {height: (height - SCAN_BOX_HEIGHT) / 2}]} />
      </View>

      {/* ❌ 닫기 버튼 */}
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      {/* 안내 문구 */}
      <View style={styles.guide}>
        <Text style={styles.guideText}>
          바코드를 가운데 사각형 안에 비춰주세요.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },

  mask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  middleRow: {
    flexDirection: 'row',
    height: SCAN_BOX_HEIGHT,
  },

  scanBox: {
    width: SCAN_BOX_WIDTH,
    height: SCAN_BOX_HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
  },

  scanLine: {
    height: 2,
    backgroundColor: 'red',
  },

  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 10,
  },

  closeText: {
    fontSize: 26,
    color: '#000',
    fontWeight: 'bold',
  },

  guide: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
  },

  guideText: {
    color: '#000',
    fontSize: 16,
  },
  counterContainer: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },

  counterText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
