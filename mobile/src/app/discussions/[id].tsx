import { useLocalSearchParams } from 'expo-router';

import { NavigationPlaceholder } from '@/components/navigation-placeholder';

export default function DiscussionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <NavigationPlaceholder title={`토론 상세 · ${id}`} />;
}
