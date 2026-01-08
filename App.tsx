import React, {useEffect, useRef, useState, useCallback} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  BackHandler,
  ToastAndroid,
  Modal,
  View,
  TouchableOpacity,
  Text,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {WebViewMessageEvent} from 'react-native-webview';
import BarcodeScan from './src/components/BarcodeScan';

const INDEX_URL = 'http://61.41.64.30:8080/hyapp/index';
const HOME_URL = 'http://61.41.64.30:8080/hyapp/main';

function App(): React.JSX.Element {
  const webviewRef = useRef<WebView>(null);

  const [canGoBack, setCanGoBack] = useState(false);
  const [barcodeScannerVisible, setBarcodeScannerVisible] = useState(false);

  const exitTimer = useRef<number | null>(null);

  /** 📌 WebView → RN 메시지 처리 */
  const handleWebMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'requestBarcodeScan') {
        setBarcodeScannerVisible(true);
      }
    } catch (e) {
      console.log('메시지 파싱 오류:', e);
    }
  };

  /** 📌 바코드 스캔 완료 → 웹으로 전달 */
  const handleBarcodeScanned = (barcodeValue: string) => {
    webviewRef.current?.postMessage(
      JSON.stringify({
        type: 'barcode',
        value: barcodeValue,
      }),
    );
    setBarcodeScannerVisible(false);
  };

  /** 📌 Android 뒤로가기 처리 */
  const handleBackPress = useCallback(() => {
    if (barcodeScannerVisible) {
      setBarcodeScannerVisible(false);
      return true;
    }

    if (canGoBack && webviewRef.current) {
      webviewRef.current.goBack();
      return true;
    }

    if (exitTimer.current) {
      BackHandler.exitApp();
      return true;
    }

    ToastAndroid.show('한 번 더 누르면 앱이 종료됩니다.', ToastAndroid.SHORT);

    exitTimer.current = setTimeout(() => {
      exitTimer.current = null;
    }, 2000) as unknown as number;

    return true;
  }, [barcodeScannerVisible, canGoBack]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );
    return () => subscription.remove();
  }, [handleBackPress]);

  return (
    <SafeAreaView style={styles.container}>
      {/* 🌐 WebView */}
      <WebView
        ref={webviewRef}
        source={{uri: INDEX_URL}}
        style={{flex: 1}}
        onNavigationStateChange={nav => setCanGoBack(nav.canGoBack)}
        onMessage={handleWebMessage}
        javaScriptEnabled
      />

      {/* 🏠 하단 홈 버튼 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => {
            webviewRef.current?.injectJavaScript(`
              window.location.href = '${HOME_URL}';
              true;
            `);
          }}>
          <Text style={styles.homeText}>홈</Text>
        </TouchableOpacity>
      </View>

      {/* 📷 바코드 스캔 */}
      <Modal visible={barcodeScannerVisible} animationType="slide">
        <BarcodeScan
          onScanned={handleBarcodeScanned}
          onClose={() => setBarcodeScannerVisible(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bottomBar: {
    height: 56,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeButton: {
    paddingHorizontal: 40,
    paddingVertical: 10,
    backgroundColor: '#007bff',
    borderRadius: 20,
  },
  homeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default App;
