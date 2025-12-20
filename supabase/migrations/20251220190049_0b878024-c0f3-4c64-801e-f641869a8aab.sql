-- Delete order status history for test order (must be deleted first due to foreign key)
DELETE FROM order_status_history WHERE order_id = '0601d84f-33cf-4ddf-b4c8-68482b9c6f2c';

-- Delete test order
DELETE FROM orders WHERE id = '0601d84f-33cf-4ddf-b4c8-68482b9c6f2c';

-- Delete test SMS logs
DELETE FROM sms_logs WHERE customer_number = '+15551234567';