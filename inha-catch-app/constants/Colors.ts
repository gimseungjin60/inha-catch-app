<<<<<<< HEAD
const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export default {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
=======
const primaryBlue = '#2962FF';
const gradientStart = '#2962FF';
const gradientEnd = '#4A3AFF';

export default {
  light: {
    text: '#111111',
    textSecondary: '#666666',
    background: '#FFFFFF',
    screenBackground: '#F5F7FA',
    tint: primaryBlue,
    primary: primaryBlue,
    gradientStart,
    gradientEnd,
    tabIconDefault: '#A0AABF',
    tabIconSelected: primaryBlue,
    border: '#E5E8EB',
    cardBackground: '#FFFFFF',
    aiBoxBackground: '#F0F5FF',
    aiBoxText: primaryBlue,
    tagBackground: '#F2F4F8',
    tagText: '#5A6B87',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#A0AABF',
    background: '#111111',
    screenBackground: '#000000',
    tint: primaryBlue,
    primary: '#4D7BFF',
    gradientStart,
    gradientEnd,
    tabIconDefault: '#666666',
    tabIconSelected: '#4D7BFF',
    border: '#333333',
    cardBackground: '#1C1C1E',
    aiBoxBackground: '#1A2952',
    aiBoxText: '#7A9FFF',
    tagBackground: '#2C2C2E',
    tagText: '#8E8E93',
>>>>>>> feature/B
  },
};
