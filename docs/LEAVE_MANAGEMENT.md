# Leave Ledger Architecture

## Key Rules
- Configurable monthly entitlement per employee (e.g. 1.5 days or 2.0 days).
- Decimal precision (`DECIMAL(5,2)`) supporting 0.5 half-day leaves.
- Transaction ledger records all credit/debit events: `LEAVE_ALLOCATION`, `LEAVE_USED`, `LEAVE_ADJUSTMENT`, `LEAVE_REVERSAL`, `LEAVE_CARRY_FORWARD`.
- Available calculation:
$$\text{Available} = \text{Entitlement} + \text{Carried Forward} + \text{Adjustments} - \text{Approved Used}$$
- Approved leaves auto-mark daily attendance status as `ON_LEAVE`.
