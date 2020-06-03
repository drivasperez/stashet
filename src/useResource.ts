import { useCreateResource } from './useCreateResource';
import { UseResourceConfig } from './types';

export function useResource<T>(
  key: string,
  asyncFunc: (prevData: T | null) => Promise<T>,
  config: UseResourceConfig = {},
  skip?: boolean
) {
  const { msLongLoadAlert = false, revalidateOnDocumentFocus = true } = config;

  const { state, refetch } = useCreateResource(
    key,
    asyncFunc,
    { ...config, msLongLoadAlert, revalidateOnDocumentFocus },
    skip
  );

  return { ...state, refetch };
}
