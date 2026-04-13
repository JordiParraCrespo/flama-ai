import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 32, fontWeight: 'bold' }}>{t('common.appName')}</Text>
      <Text style={{ marginTop: 16, color: '#737373' }}>Your app starts here.</Text>
    </View>
  );
}
