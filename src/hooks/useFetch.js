import { useState, useEffect, useCallback, useRef } from 'react';

const useFetch = (fetchFunction, dependencies = [], immediate = true) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  // Store fetch function in ref to avoid recreating effects
  const fetchFunctionRef = useRef(fetchFunction);
  useEffect(() => {
    fetchFunctionRef.current = fetchFunction;
  });

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const execute = useCallback(async (...args) => {
    if (!isMounted.current) return null;
    setLoading(true);
    setError(null);
    try {
      if (!fetchFunctionRef.current) {
        setLoading(false);
        return null;
      }
      const result = await fetchFunctionRef.current(...args);
      if (isMounted.current) {
        setData(result);
        setError(null);
      }
      return result;
    } catch (err) {
      if (isMounted.current) {
        const is404 = err.response?.status === 404;
        if (is404) {
          setData(null);
          setError(null);
          return null;
        }
        let errorMessage = 'Failed to fetch data';
        if (err.response?.data?.error) errorMessage = err.response.data.error;
        else if (err.message) errorMessage = err.message;
        else if (err.error) errorMessage = err.error;
        console.error('Fetch error:', errorMessage);
        setError(errorMessage);
        setData(null);
      }
      throw err;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const refetch = useCallback((...args) => execute(...args), [execute]);

  // Main fetch effect - runs once on mount and when dependencies change
  useEffect(() => {
    if (!immediate) return;
    
    let isActive = true;
    const fetchData = async () => {
      if (!fetchFunctionRef.current) return;
      setLoading(true);
      setError(null);
      try {
        const result = await fetchFunctionRef.current();
        if (isActive) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (isActive) {
          const is404 = err.response?.status === 404;
          if (is404) {
            setData(null);
            setError(null);
            return;
          }
          console.error('useFetch: Initial fetch failed', err);
          let errorMessage = 'Failed to fetch data';
          if (err.response?.data?.error) errorMessage = err.response.data.error;
          else if (err.message) errorMessage = err.message;
          setError(errorMessage);
          setData(null);
        }
      } finally {
        if (isActive) setLoading(false);
      }
    };

    fetchData();
    return () => { isActive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { data, loading, error, refetch, execute };
};

export default useFetch;