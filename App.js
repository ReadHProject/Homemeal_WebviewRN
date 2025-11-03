import React, { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  RefreshControl,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import Constants from "expo-constants";

export default function App() {
  const webViewRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  // ✅ Ask for GPS Permission
  const requestLocationPermission = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Needed",
        "Please allow location access to use GPS features."
      );
    }
  };

  // ✅ Pull to Refresh for WebView
  const onRefresh = () => {
    setRefreshing(true);
    webViewRef.current?.reload();
    setTimeout(() => setRefreshing(false), 800); // smooth refresh
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      {/* ✅ Status bar setup */}
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />

      {/* ✅ Prevents content overlapping status bar */}
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
          geolocationEnabled={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          renderLoading={() => (
            <ActivityIndicator size="large" style={{ flex: 1 }} />
          )}
          // ✅ Pull-to-refresh works on iOS (Android uses built-in refresh)
          refreshControl={
            Platform.OS === "ios" && (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}
