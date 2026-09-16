import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getMyLocation } from '../../api/client.js';
import { useIsCompact } from '../../hooks/useMediaQuery.js';
import MapShell from '../Map/MapShell.jsx';

// Account screens sit in the profile column  
export default function AccountShell({ subtitle, sidebar = null, children }) {
  const [location, setLocation] = useState(null);
  const isCompact = useIsCompact();

  useEffect(() => {
    getMyLocation()
      .then(setLocation)
      .catch(() => {});
  }, []);

  const body = <div className="account-panel">{children}</div>;

  return (
    <MapShell
      title="LGBTQIA+ Safety Index"
      subtitle={subtitle}
      center={location ? [location.lat, location.lng] : [28.5978, -81.3024]}
      zoom={12}
      detail={isCompact ? null : body}
    >
      {sidebar ?? (
        <Link className="chip" to="/">
          Back to search
        </Link>
      )}

      {isCompact && body}
    </MapShell>
  );
}
