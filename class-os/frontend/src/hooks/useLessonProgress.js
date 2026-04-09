import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  getCompletedLessonIds,
  patchLessonCompleted,
  syncLegacyCompletedLessons,
} from '../api/lessonProgress.js';

const LEGACY_KEY = 'class-os-completed';

/** One-time legacy localStorage → API migration; shared across all hook instances. */
let legacyMigrationHandled = false;

export function useLessonProgress() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['lessonProgress'],
    queryFn: getCompletedLessonIds,
  });

  useEffect(() => {
    if (legacyMigrationHandled || !query.isSuccess) return;
    const fromApi = query.data?.lessonIds ?? [];
    if (fromApi.length > 0) {
      legacyMigrationHandled = true;
      try {
        localStorage.removeItem(LEGACY_KEY);
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      if (!raw) {
        legacyMigrationHandled = true;
        return;
      }
      const legacy = JSON.parse(raw);
      if (!Array.isArray(legacy) || legacy.length === 0) {
        legacyMigrationHandled = true;
        return;
      }
      legacyMigrationHandled = true;
      syncLegacyCompletedLessons(legacy)
        .then(() => {
          try {
            localStorage.removeItem(LEGACY_KEY);
          } catch {
            /* ignore */
          }
          queryClient.invalidateQueries({ queryKey: ['lessonProgress'] });
        })
        .catch(() => {});
    } catch {
      legacyMigrationHandled = true;
    }
  }, [query.isSuccess, query.data, queryClient]);

  const mutation = useMutation({
    mutationFn: ({ lessonId, completed }) => patchLessonCompleted(lessonId, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessonProgress'] });
    },
  });

  const lessonIds = query.data?.lessonIds ?? [];

  const isLessonDone = (lessonId) => lessonIds.includes(String(lessonId));

  const setLessonCompleted = (lessonId, completed) => {
    mutation.mutate({ lessonId: String(lessonId), completed });
  };

  const toggleLesson = (lessonId) => {
    setLessonCompleted(lessonId, !isLessonDone(lessonId));
  };

  return {
    lessonIds,
    isLoading: query.isLoading,
    isLessonDone,
    setLessonCompleted,
    toggleLesson,
    isUpdating: mutation.isPending,
  };
}
