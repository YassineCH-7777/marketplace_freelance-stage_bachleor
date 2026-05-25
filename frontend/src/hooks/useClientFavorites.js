import { useCallback, useEffect, useMemo, useState } from 'react';
import useAuth from '@/hooks/useAuth';
import { getClientFavorites } from '@/api/favoriteApi';

function matchesFavorite(favorite, target) {
  if (target.type === 'SERVICE') {
    return favorite.type === 'SERVICE' && String(favorite.serviceId) === String(target.serviceId);
  }
  return favorite.type === 'FREELANCER' && String(favorite.freelancerId) === String(target.freelancerId);
}

export default function useClientFavorites() {
  const { user, isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const canUseFavorites = isAuthenticated && user?.role === 'CLIENT';

  const loadFavorites = useCallback(() => {
    if (!canUseFavorites) {
      setFavorites([]);
      return Promise.resolve([]);
    }

    setLoading(true);
    return getClientFavorites()
      .then((response) => {
        setFavorites(response.data || []);
        return response.data || [];
      })
      .catch(() => {
        setFavorites([]);
        return [];
      })
      .finally(() => setLoading(false));
  }, [canUseFavorites]);

  useEffect(() => {
    let isMounted = true;

    Promise.resolve().then(() => {
      if (isMounted) {
        loadFavorites();
      }
    });

    return () => {
      isMounted = false;
    };
  }, [loadFavorites]);

  const serviceIds = useMemo(
    () => new Set(favorites.filter((favorite) => favorite.type === 'SERVICE').map((favorite) => String(favorite.serviceId))),
    [favorites],
  );

  const freelancerIds = useMemo(
    () =>
      new Set(
        favorites
          .filter((favorite) => favorite.type === 'FREELANCER')
          .map((favorite) => String(favorite.freelancerId)),
      ),
    [favorites],
  );

  const upsertFavorite = useCallback((favorite) => {
    setFavorites((current) => [favorite, ...current.filter((entry) => !matchesFavorite(entry, favorite))]);
  }, []);

  const removeFavorite = useCallback((target) => {
    setFavorites((current) => current.filter((entry) => !matchesFavorite(entry, target)));
  }, []);

  return {
    canUseFavorites,
    favorites,
    freelancerIds,
    loading,
    loadFavorites,
    removeFavorite,
    serviceIds,
    upsertFavorite,
  };
}
