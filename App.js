import React, { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
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
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [exitApp, setExitApp] = useState(false);
  const [firstLaunch, setFirstLaunch] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const [paymentLink, setPaymentLink] = useState(null);

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

  // ✅ Android Back Button handling
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

  // ✅ Refresh Handler
  const onRefresh = () => {
    if (isAtTop) {
      setRefreshing(true);
      webViewRef.current?.reload();
      setTimeout(() => setRefreshing(false), 1200);
    }
  };

  // ✅ Scroll listener (to detect top for refresh)
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
    } catch (e) {
      console.log("Scroll message parse failed:", e);
    }
  };

  // ✅ Handle navigation
  const handleNavigation = (navEvent) => {
    const url = navEvent?.url || navEvent?.nativeEvent?.url;
    if (!url) return true;

    if (url.startsWith("upi://") || url.startsWith("intent://")) {
      try {
        Linking.openURL(url);
      } catch (error) {
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

  // ✅ FINAL LAYOUT FIX — NO OVERLAP, NO GAP
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <StatusBar
        translucent={false} // makes sure content is below status bar
        backgroundColor="#ffffff"
        barStyle="dark-content"
      />

      <View
        style={{
          flex: 1,
          backgroundColor: "#ffffff",
          paddingTop: Platform.OS === "android" ? 0 : 0, // keep balanced top space
        }}
      >
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
            onNavigationStateChange={(navState) =>
              setCanGoBack(navState.canGoBack)
            }
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
      </View>
    </SafeAreaView>
  );
}
