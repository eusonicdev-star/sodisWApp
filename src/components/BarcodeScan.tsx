import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Vibration,
  TouchableOpacity,
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

/** 🔴 중앙 스캔 라인 */
const SCAN_LINE_Y = height / 2;
const SCAN_LINE_TOLERANCE = 20; // ±20px 허용

const GREEN_LINE_OFFSET = 30; // 빨간 선 아래 30px

function isOnScanLine(code: Code): boolean {
  if (!code.frame) return false;

  const {y, height: h} = code.frame;
  const codeCenterY = y + h / 2;

  return (
    codeCenterY >= SCAN_LINE_Y - SCAN_LINE_TOLERANCE &&
    codeCenterY <= SCAN_LINE_Y + SCAN_LINE_TOLERANCE
  );
}

export default function BarcodeScan({onScanned, onClose}: BarcodeScanProps) {
  const device = useCameraDevice('back');
  const {hasPermission, requestPermission} = useCameraPermission();

  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);

  const lastScanTime = useRef(0);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  /** 바코드 스캐너 (항상 부착) */
  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'code-128', 'ean-13', 'ean-8', 'code-39'],
    onCodeScanned: codes => {
      if (!scanning) return;

      const now = Date.now();
      if (now - lastScanTime.current < 1200) return;

      for (const code of codes) {
        if (!code.value || !code.frame) continue;
        if (!isOnScanLine(code)) continue;

        lastScanTime.current = now;
        const value = code.value.trim();
        if (!value) return;

        Vibration.vibrate(80);

        // 1️⃣ 스캔 중단
        setScanning(false);

        // 2️⃣ 카메라 즉시 정지 (체감 속도 핵심)
        setCameraActive(false);

        // 3️⃣ 결과 즉시 전달
        onScanned(value);

        // 4️⃣ Modal 닫기 (비동기)
        setTimeout(() => {
          onClose();
        }, 0);

        return;
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
      {/* 📷 카메라 */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={cameraActive}
        codeScanner={codeScanner}
      />

      {/* 🔴 중앙 스캔 가이드 라인 */}
      <View
        style={{
          position: 'absolute',
          top: SCAN_LINE_Y,
          left: '5%',
          width: '90%',
          height: 2,
          backgroundColor: 'red',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: SCAN_LINE_Y + GREEN_LINE_OFFSET,
          left: '5%',
          width: '90%',
          height: 2,
          backgroundColor: 'green',
        }}
      />

      {/* ▶️ 스캔 버튼 */}
      {!scanning && (
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => {
            lastScanTime.current = 0;
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
});
