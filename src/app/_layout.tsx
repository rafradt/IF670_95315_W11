import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Camera & Location to Supabase',
          headerStyle: { backgroundColor: '#1f2937' },
          headerTintColor: '#fff',
        }} 
      />
    </Stack>
  );
}