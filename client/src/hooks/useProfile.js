import { useEffect, useState } from 'react';

import { getBusiness, lookupPlace, saveBusiness, addReview } from '../api/client.js';

export const BLANK_REVIEW = {
  author: '',
  comment: '',
  rating: 0,
  genderNeutralRestroom: false,
  wheelchairAccessible: false,
};

export function useProfile(osmId) {
  const [place, setPlace] = useState(null);
  const [form, setForm] = useState(BLANK_REVIEW);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getBusiness(osmId)
      .catch((err) => {
        if (err.status !== 404) throw err;
        return lookupPlace(osmId);
      })
      .then((data) => !cancelled && setPlace(data))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [osmId]);

  async function submitReview(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    if (!form.rating) {
      setSaving(false);
      setError('Pick a star rating first.');
      return;
    }

    try {

      const { name, address, category, lat, lng, phone, website } = place;
      await saveBusiness({ osmId, name, address, category, lat, lng, phone, website });

      setPlace(await addReview(osmId, form));
      setForm(BLANK_REVIEW);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return {
    place,
    form,
    setForm,
    loading,
    saving,
    error,
    setError,
    submitReview,
    reviewCount: place?.reviews?.length ?? 0,
  };
}
