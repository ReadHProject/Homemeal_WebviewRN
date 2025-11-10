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

  // ✅ Handle UPI, Intent links, and Payment Status redirects
  const handleNavigation = (event) => {
    const url = event.url;

    // 🔹 Detect and open UPI / Intent links externally
    if (url.startsWith("upi://") || url.startsWith("intent://")) {
      try {
        Linking.openURL(url);
      } catch (error) {
        Alert.alert("Error", "Unable to open UPI app");
      }
      return false; // Prevent WebView from blocking it
    }

    // 🔹 Detect when user is redirected back after payment
    if (url.includes("/PhonePe/PaymentStatus")) {
      if (
        url.toLowerCase().includes("success") ||
        url.toLowerCase().includes("completed")
      ) {
        Alert.alert(
          "Payment Successful",
          "Your transaction was completed successfully!"
        );
      } else if (url.toLowerCase().includes("failed")) {
        Alert.alert("Payment Failed", "Your payment could not be processed.");
      } else {
        Alert.alert("Payment Update", "Your payment status has been updated.");
      }
    }

    return true; // Allow other navigations normally
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
          source={{ uri: "https://homemeal.store" }}
          startInLoadingState={true}
          renderLoading={FirstLaunchScreen}
          onNavigationStateChange={(navState) =>
            setCanGoBack(navState.canGoBack)
          }
          onShouldStartLoadWithRequest={handleNavigation}
          originWhitelist={["*"]}
          mixedContentMode="always"
          geolocationEnabled={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
        />
      </View>
    </SafeAreaView>
  );
}
