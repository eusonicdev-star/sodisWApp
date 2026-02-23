import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Vibration,
  TouchableOpacity,
  Alert,
  BackHandler,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
  Code,
} from 'react-native-vision-camera';

interface BarcodeScanProps {
  onScanned: (value: string) => void;
  onClose: () => void;
}

const {height} = Dimensions.get('window');

const SCAN_LINE_Y = height / 2;
const SCAN_LINE_TOLERANCE = 20;
const GREEN_LINE_OFFSET = 30;

function isOnScanLine(code: Code): boolean {
  if (!code.frame) return false;
  const {y, height: h} = code.frame;
  const centerY = y + h / 2;

  return (
    centerY >= SCAN_LINE_Y - SCAN_LINE_TOLERANCE &&
    centerY <= SCAN_LINE_Y + SCAN_LINE_TOLERANCE
  );
}

export default function BarcodeScan({onScanned, onClose}: BarcodeScanProps) {
  const device = useCameraDevice('back');
  const {hasPermission, requestPermission} = useCameraPermission();

  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [matchCount, setMatchCount] = useState(0);
  const [lastScannedValue, setLastScannedValue] = useState<string | null>(null);

  const lastScanTimeRef = useRef(0);
  const lastValueRef = useRef<string | null>(null);
  const matchCountRef = useRef(0);
  const lastFrameRef = useRef<{y: number; h: number} | null>(null);

  useEffect(() => {
    const onBackPress = () => {
      Alert.alert('스캔 취소', '스캔을 취소하시겠습니까?', [
        {text: '아니오', style: 'cancel'},
        {
          text: '예',
          style: 'destructive',
          onPress: () => {
            setScanning(false);
            setCameraActive(false);
            onClose();
          },
        },
      ]);
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [onClose]);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'code-128', 'ean-13', 'ean-8', 'code-39'],
    onCodeScanned: codes => {
      if (!scanning) return;

      for (const code of codes) {
        if (!code.value || !code.frame) continue;
        if (!isOnScanLine(code)) continue;

        const value = code.value.trim();
        if (!value) continue;

        // 🔹 길이 필터 (노이즈 제거)
        if (value.length < 6 || value.length > 32) continue;

        const now = Date.now();
        if (now - lastScanTimeRef.current < 150) continue;
        lastScanTimeRef.current = now;

        // 🔹 프레임 안정성 체크
        if (lastFrameRef.current) {
          const dy = Math.abs(code.frame.y - lastFrameRef.current.y);
          const dh = Math.abs(code.frame.height - lastFrameRef.current.h);
          if (dy > 15 || dh > 15) {
            lastFrameRef.current = {
              y: code.frame.y,
              h: code.frame.height,
            };
            continue;
          }
        }

        lastFrameRef.current = {
          y: code.frame.y,
          h: code.frame.height,
        };

        // 🔁 2회 검증
        if (lastValueRef.current === value) {
          matchCountRef.current += 1;
        } else {
          lastValueRef.current = value;
          matchCountRef.current = 1;
        }

        setMatchCount(matchCountRef.current);
        setLastScannedValue(value);

        if (matchCountRef.current >= 2) {
          Vibration.vibrate(60);
          setScanning(false);
          setCameraActive(false);
          onScanned(value);
          onClose();
          return;
        }
      }
    },
  });

  if (!hasPermission || !device) {
    return (
      <View style={styles.center}>
        <Text>카메라 준비 중...</Text>
      </View>
    );
  }

  return (
    <View style={{flex: 1}}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={cameraActive}
        codeScanner={codeScanner}
      />

      {/* 🔢 카운터 & 값 표시 */}
      <View pointerEvents="none" style={styles.counterContainer}>
        <Text style={styles.counterText}>{matchCount} / 2</Text>
        {lastScannedValue && (
          <Text style={styles.valueText}>{lastScannedValue}</Text>
        )}
      </View>

      {/* 🟢 녹색 라인 */}
      <View
        style={[
          styles.line,
          {top: SCAN_LINE_Y, backgroundColor: 'green', height: 2},
        ]}
      />

      {/* 🟡 노란 라인 */}
      <View
        style={[
          styles.line,
          {
            top: SCAN_LINE_Y + GREEN_LINE_OFFSET,
            backgroundColor: 'yellow',
            height: 1,
          },
        ]}
      />

      {/* 🔴 빨간 라인 */}
      <View
        style={[
          styles.line,
          {
            top: SCAN_LINE_Y + GREEN_LINE_OFFSET * 2,
            backgroundColor: 'red',
            height: 2,
          },
        ]}
      />

      {!scanning && (
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => {
            lastScanTimeRef.current = 0;
            lastValueRef.current = null;
            matchCountRef.current = 0;
            setMatchCount(0);
            setLastScannedValue(null);
            setCameraActive(true);
            setScanning(true);
          }}>
          <Text style={styles.scanButtonText}>스캔하기</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    position: 'absolute',
    left: '5%',
    width: '90%',
  },
  scanButton: {
    position: 'absolute',
    bottom: 60,
    left: '25%',
    width: '50%',
    padding: 15,
    backgroundColor: '#007bff',
    borderRadius: 10,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterContainer: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  counterText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  valueText: {
    marginTop: 4,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
