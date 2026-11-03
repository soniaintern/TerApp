import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * Container-level navigation ref — lets any component navigate to any screen
 * in the tree (e.g. My Account → SupervisorPanel) without depending on
 * nested-navigator action bubbling.
 */
export const navigationRef = createNavigationContainerRef<any>();

export function navigateTo(name: string, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}
