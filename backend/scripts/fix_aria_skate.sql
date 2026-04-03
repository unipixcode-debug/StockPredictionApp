-- ARIA should be closer to real value, SKATE should be OPEN if timeout occurred
UPDATE "ExecutedTrades" SET pnl = -1.62, "exitPrice" = 0.4535 WHERE symbol LIKE '%ARIA%' AND status = 'CLOSED';
UPDATE "ExecutedTrades" SET status = 'OPEN' WHERE symbol LIKE '%SKATE%' AND status = 'CLOSED' AND "exchangeOrderId" = 'DETECTED';
