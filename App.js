import React, { useEffect, useRef, useState } from "react";
import {
  View,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  Image,
  Text,
  BackHandler,
  ToastAndroid,
  RefreshControl,
  ScrollView,
  Linking,
  AppState,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

function MainApp() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [exitApp, setExitApp] = useState(false);
  const [firstLaunch, setFirstLaunch] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const [paymentLink, setPaymentLink] = useState(null);
  const [bottomPadding, setBottomPadding] = useState(0);
  const insets = useSafeAreaInsets();

  // ✅ Recalculate bottom padding only once (prevent double padding after resume)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setTimeout(() => {
          // Limit inset to reasonable max value (e.g. 24px)
          setBottomPadding(Math.min(insets.bottom || 0, 24));
        }, 300);
      }
    });
    return () => subscription.remove();
  }, [insets.bottom]);

  useEffect(() => {
    const checkFirstLaunch = async () => {
      const value = await AsyncStorage.getItem("hasLaunched");
      if (value === null) {
        await AsyncStorage.setItem("hasLaunched", "true");
        setFirstLaunch(true);
      } else {
        setFirstLaunch(false);
      }
    };
    checkFirstLaunch();
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Needed",
        "Please allow location access to use GPS features."
      );
    }
  };

  // ✅ Back handler
  useEffect(() => {
    const backAction = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      if (!exitApp) {
        setExitApp(true);
        ToastAndroid.show("Press again to exit", ToastAndroid.SHORT);
        setTimeout(() => setExitApp(false), 2000);
        return true;
      }
      BackHandler.exitApp();
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => backHandler.remove();
  }, [canGoBack, exitApp]);

  // ✅ Splash Screen
  const FirstLaunchScreen = () => (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
      }}
    >
      <Image
        source={require("./assets/homewhitelogo.png")}
        style={{ width: 120, height: 120, marginBottom: 20 }}
        resizeMode="contain"
      />
      <ActivityIndicator size={60} color="#FF6F00" />
      <Text
        style={{
          marginTop: 15,
          color: "#555",
          fontSize: 16,
          fontWeight: "500",
        }}
      >
        Cooking something delicious...
      </Text>
    </View>
  );

  // ✅ Refresh handler
  const onRefresh = () => {
    if (isAtTop) {
      setRefreshing(true);
      webViewRef.current?.reload();
      setTimeout(() => setRefreshing(false), 1200);
    }
  };

  // ✅ Scroll detection
  const injectedScrollScript = `
    window.addEventListener('scroll', function() {
      const isTop = window.scrollY <= 0;
      window.ReactNativeWebView.postMessage(JSON.stringify({ isTop }));
    });
    true;
  `;

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.isTop !== undefined) {
        setIsAtTop(data.isTop);
      }
    } catch {}
  };

  // ✅ Dynamic StatusBar color
  const handleNavigation = (navEvent) => {
    const url = navEvent?.url || navEvent?.nativeEvent?.url;
    if (!url) return true;

    if (
      url.includes("/dash/subscription") ||
      url.includes("/payment") ||
      url.includes("PhonePe") ||
      url.includes("Cashfree")
    ) {
      StatusBar.setBackgroundColor("#FF6F00");
      StatusBar.setBarStyle("light-content");
    } else {
      StatusBar.setBackgroundColor("#ffffff");
      StatusBar.setBarStyle("dark-content");
    }

    if (url.startsWith("upi://") || url.startsWith("intent://")) {
      try {
        Linking.openURL(url);
      } catch {
        Alert.alert("Error", "Unable to open UPI app");
      }
      return false;
    }

    return true;
  };

  // ✅ First Launch Logic
  if (firstLaunch === null) return null;
  if (firstLaunch) {
    setTimeout(() => setFirstLaunch(false), 2000);
    return <FirstLaunchScreen />;
  }

  // ✅ Final Perfect Layout — consistent top/bottom spacing even after switching apps
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#ffffff",
        paddingTop: Platform.OS === "android" ? 0 : insets.top,
        paddingBottom: bottomPadding, // ✅ fixed stable bottom padding
      }}
    >
      <StatusBar
        translucent={true}
        backgroundColor="transparent"
        barStyle="dark-content"
      />

      <ScrollView
        contentContainerStyle={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            enabled={isAtTop}
            colors={["#FF6F00"]}
          />
        }
      >
        <WebView
          ref={webViewRef}
          source={{
            uri: paymentLink ? paymentLink : "https://homemeal.store",
          }}
          startInLoadingState={true}
          renderLoading={FirstLaunchScreen}
          onShouldStartLoadWithRequest={handleNavigation}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
            handleNavigation(navState);
          }}
          originWhitelist={["*"]}
          mixedContentMode="always"
          javaScriptEnabled={true}
          domStorageEnabled={true}
          geolocationEnabled={true}
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          onMessage={handleMessage}
          injectedJavaScript={injectedScrollScript}
          userAgent="Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
          style={{
            flex: 1,
            backgroundColor: "#ffffff",
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}
