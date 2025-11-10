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
  Linking,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [exitApp, setExitApp] = useState(false);
  const [firstLaunch, setFirstLaunch] = useState(null);
  const [paymentLink, setPaymentLink] = useState(null); // ✅ for Cashfree or PhonePe

  // ✅ Detect first-time launch
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

  // ✅ Request location permission
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

  // ✅ Custom splash screen
  const FirstLaunchScreen = () => (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#ffffff",
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

  // ⛔ Avoid flicker until we know if first launch
  if (firstLaunch === null) return null;

  // ✅ Show splash only on first app launch
  if (firstLaunch) {
    setTimeout(() => setFirstLaunch(false), 2000);
    return <FirstLaunchScreen />;
  }

  // ✅ Unified Payment Handler (PhonePe + Cashfree)
  const handleNavigation = (navEvent) => {
    const url = navEvent?.url || navEvent?.nativeEvent?.url;
    if (!url) return true;

    // console.log("➡ Navigating to:", url);

    // 🔹 Detect Cashfree/PhonePe checkout links
    if (
      url.startsWith("https://api.cashfree.com/checkout") ||
      url.startsWith("https://payments.cashfree.com") ||
      url.startsWith("https://sandbox.cashfree.com")
    ) {
      console.log("🟢 Cashfree Checkout page detected");
      return true;
    }

    // 🔹 Handle UPI / Intent URLs for both gateways
    if (url.startsWith("upi://") || url.startsWith("intent://")) {
      try {
        if (url.startsWith("intent://")) {
          const fallbackMatch = url.match(/S\.browser_fallback_url=([^;]+)/);
          if (fallbackMatch && fallbackMatch[1]) {
            const fallbackUrl = decodeURIComponent(fallbackMatch[1]);
            console.log("➡ Opening fallback URL:", fallbackUrl);
            Linking.openURL(fallbackUrl);
            return false;
          }
        }
        Linking.openURL(url);
      } catch (error) {
        console.warn("Error opening UPI intent:", error);
        Alert.alert("Error", "Unable to open UPI app. Please try again.");
      }
      return false; // prevent WebView from blocking
    }

    // 🔹 Handle Cashfree Return URL
    if (url.includes("/Cashfree/PaymentReturn")) {
      console.log("✅ Cashfree Return URL triggered");
      setTimeout(() => {
        if (url.toLowerCase().includes("success")) {
          Alert.alert(
            "Cashfree Payment Successful",
            "Your transaction was successful!"
          );
        } else if (url.toLowerCase().includes("failed")) {
          Alert.alert(
            "Cashfree Payment Failed",
            "Payment could not be processed."
          );
        } else {
          Alert.alert("Cashfree Payment Update", "Payment status updated.");
        }
      }, 500);
      return true;
    }

    // 🔹 Handle Cashfree Notify URL (server-side only)
    if (url.includes("/Cashfree/PaymentSuccess")) {
      console.log("ℹ️ Cashfree Payment Notify (handled by server)");
      return true;
    }

    // 🔹 Handle PhonePe Return URL
    if (url.includes("/PhonePe/PaymentStatus")) {
      console.log("✅ PhonePe Return URL triggered");
      setTimeout(() => {
        if (
          url.toLowerCase().includes("success") ||
          url.toLowerCase().includes("completed")
        ) {
          Alert.alert(
            "PhonePe Payment Successful",
            "Your PhonePe transaction was completed successfully!"
          );
        } else if (url.toLowerCase().includes("failed")) {
          Alert.alert("PhonePe Payment Failed", "Your PhonePe payment failed.");
        } else {
          Alert.alert("PhonePe Payment Update", "Payment status updated.");
        }
      }, 500);
      return true;
    }

    return true; // ✅ always return a boolean
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />

      <View
        style={{
          flex: 1,
          paddingTop: Platform.OS === "android" ? Constants.statusBarHeight : 0,
        }}
      >
        <WebView
          ref={webViewRef}
          source={{
            uri: paymentLink
              ? paymentLink // ✅ dynamically load payment link (Cashfree/PhonePe)
              : "https://homemeal.store",
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
          userAgent="Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
        />
      </View>
    </SafeAreaView>
  );
}
