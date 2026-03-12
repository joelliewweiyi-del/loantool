import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Loans from './Loans';

/**
 * Mobile-only route: shows RED IV + TLF loans in read-only mode.
 * Reuses the Loans page but forces non-pipeline vehicles.
 */
export default function Portfolio() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!searchParams.get('vehicle')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('vehicle', 'RED IV');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return <Loans mobilePortfolio />;
}
