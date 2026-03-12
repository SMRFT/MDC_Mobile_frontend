import { Platform } from 'react-native';

// Use your computer's IP address if testing on a physical device.
// 10.0.2.2 is the default for Android emulators to access the host machine.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:8000/api' : 'http://localhost:8000/api');


export default {
    API_BASE_URL,
};
