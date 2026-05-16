import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../utils/supabase";

export default function Index() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<boolean | null>(
    null,
  );

  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);

  const cameraRef = useRef<CameraView>(null);

  // Mengambil izin lokasi saat aplikasi dibuka (Week 10)
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === "granted");
    })();
  }, []);

  if (!cameraPermission || locationPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1f2937" />
      </View>
    );
  }

  if (!cameraPermission.granted || !locationPermission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.permissionText}>
          Aplikasi membutuhkan akses Kamera dan Lokasi untuk melanjutkan tugas
          ini.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={requestCameraPermission}
        >
          <Text style={styles.buttonText}>Aktifkan Izin Kamera</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { marginTop: 12, backgroundColor: "#4b5563" }]}
          onPress={async () => {
            const { status } =
              await Location.requestForegroundPermissionsAsync();
            setLocationPermission(status === "granted");
          }}
        >
          <Text style={styles.buttonText}>Aktifkan Izin Lokasi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        setUploading(true);

        // 1. Ambil koordinat GPS perangkat (Week 10)
        const currentPosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(currentPosition);

        // 2. Ambil foto menggunakan CameraView API terbaru (Week 9)
        const options = { quality: 0.5 };
        const data = await cameraRef.current.takePictureAsync(options);

        if (data?.uri) {
          setPhoto(data.uri);
          // 3. Upload langsung ke backend Supabase (Week 11)
          await uploadToSupabase(data.uri, currentPosition);
        }
      } catch (error: any) {
        Alert.alert(
          "Gagal",
          error.message || "Gagal mengambil foto atau koordinat lokasi.",
        );
      } finally {
        setUploading(false);
      }
    }
  };

  const uploadToSupabase = async (
    uri: string,
    locationData: Location.LocationObject,
  ) => {
    try {
      const fileName = `photo-${Date.now()}.jpeg`;

      // Mengonversi URI gambar menjadi Blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload file gambar biner ke Supabase Storage Bucket bernama 'photos'
      const { data: storageData, error: storageError } = await supabase.storage
        .from("photos")
        .upload(fileName, blob, {
          contentType: "image/jpeg",
        });

      if (storageError) throw storageError;

      // Mendapatkan tautan URL publik gambar dari storage bucket
      const {
        data: { publicUrl },
      } = supabase.storage.from("photos").getPublicUrl(fileName);

      // Memasukkan record data ke tabel 'photo' di Database [cite: 347]
      const { error: dbError } = await supabase.from("photo").insert([
        {
          latitude: locationData.coords.latitude.toString(),
          longitude: locationData.coords.longitude.toString(),
          image_url: publicUrl,
        },
      ]);

      if (dbError) throw dbError;

      Alert.alert(
        "Sukses",
        "Data gambar dan lokasi berhasil disimpan ke database Supabase!",
      );
    } catch (error: any) {
      Alert.alert(
        "Gagal Upload",
        error.message || "Terjadi kesalahan saat memproses data ke Supabase.",
      );
    }
  };

  return (
    <View style={styles.container}>
      {!photo ? (
        <CameraView style={styles.camera} ref={cameraRef}>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.captureButton,
                uploading && { backgroundColor: "#9ca3af" },
              ]}
              onPress={takePicture}
              disabled={uploading}
            >
              <Text style={styles.captureText}>
                {uploading ? "SEDANG MEMPROSES..." : "AMBIL FOTO & SIMPAN"}
              </Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photo }} style={styles.previewImage} />
          {location && (
            <View style={styles.locationInfo}>
              <Text style={styles.locationTitle}>METADATA KOORDINAT</Text>
              <Text style={styles.locationText}>
                Lat: {location.coords.latitude}
              </Text>
              <Text style={styles.locationText}>
                Lng: {location.coords.longitude}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: "#ef4444", width: "100%" },
            ]}
            onPress={() => {
              setPhoto(null);
              setLocation(null);
            }}
          >
            <Text style={styles.buttonText}>Ambil Foto Baru</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f3f4f6",
  },
  camera: {
    flex: 1,
    justifyContent: "flex-end",
  },
  buttonContainer: {
    backgroundColor: "transparent",
    margin: 32,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: 16,
  },
  captureButton: {
    backgroundColor: "#1f2937",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  captureText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  permissionText: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
  },
  button: {
    backgroundColor: "#1f2937",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  previewContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  previewImage: {
    width: "100%",
    height: "55%",
    borderRadius: 16,
    marginBottom: 16,
  },
  locationInfo: {
    backgroundColor: "#1f2937",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    width: "100%",
  },
  locationTitle: {
    color: "#9ca3af",
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 6,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  locationText: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "monospace",
    marginVertical: 1,
  },
});
