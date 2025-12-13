import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface VapiPhoneNumber {
  id: string;
  number: string;
  name: string | null;
  assistantId: string | null;
}

export const useVapiPhoneNumbers = (autoFetch = true) => {
  const [phoneNumbers, setPhoneNumbers] = useState<VapiPhoneNumber[]>([]);
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState<VapiPhoneNumber | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPhoneNumbers = async () => {
    setLoading(true);
    setError(null);

    try {
      // First try to get Twilio numbers from cache
      const { data: cachedData } = await supabase
        .from('vapi_phone_numbers_cache')
        .select('id, number, name, assistant_id, full_data')
        .eq('full_data->>provider', 'twilio');

      if (cachedData && cachedData.length > 0) {
        const numbers = cachedData.map((pn) => ({
          id: pn.id,
          number: pn.number || '',
          name: pn.name,
          assistantId: pn.assistant_id,
        }));
        setPhoneNumbers(numbers);
        
        // Auto-select first Twilio phone number
        if (numbers.length > 0) {
          setTwilioPhoneNumber(numbers[0]);
        }
        
        setLoading(false);
        
        // Trigger background sync
        supabase.functions.invoke('vapi-sync', { body: { syncType: 'phone-numbers' } })
          .catch(err => console.log('Background sync error:', err));
        
        return;
      }

      // If cache is empty, fetch from Vapi API
      console.log('Cache empty, fetching phone numbers from Vapi API...');
      const { data, error: fnError } = await supabase.functions.invoke('vapi-proxy', {
        body: {
          endpoint: '/phone-number',
          method: 'GET',
        },
      });

      if (fnError) {
        console.error('Error fetching phone numbers from Vapi:', fnError);
        setError(fnError.message);
        setPhoneNumbers([]);
        return;
      }

      if (data?.error) {
        console.error('Vapi API error:', data);
        setError(data.error);
        setPhoneNumbers([]);
        return;
      }

      // Parse the response and filter for Twilio numbers only
      const numbersArray = Array.isArray(data) ? data : [];
      const twilioNumbers = numbersArray.filter((pn: any) => pn.provider === 'twilio');
      
      const numbers = twilioNumbers.map((pn: any) => ({
        id: pn.id,
        number: pn.number || pn.twilioPhoneNumber || '',
        name: pn.name || null,
        assistantId: pn.assistantId || null,
      }));

      setPhoneNumbers(numbers);
      
      // Auto-select first Twilio phone number
      if (numbers.length > 0) {
        setTwilioPhoneNumber(numbers[0]);
      }

      // Cache only Twilio numbers in Supabase
      if (twilioNumbers.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          for (const pn of twilioNumbers) {
            await supabase.from('vapi_phone_numbers_cache').upsert({
              id: pn.id,
              number: pn.number || pn.twilioPhoneNumber || '',
              name: pn.name || null,
              assistant_id: pn.assistantId || null,
              user_id: user.id,
              full_data: pn,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching phone numbers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch phone numbers');
      setPhoneNumbers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchPhoneNumbers();
    }
  }, [autoFetch]);

  return { phoneNumbers, twilioPhoneNumber, loading, error, refresh: fetchPhoneNumbers };
};
