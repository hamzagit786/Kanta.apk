# Security Specification - Shop Khata & Profit Manager

## 1. Data Invariants
1. **User Isolation**: A business owner can only read, create, update, or delete data within their own `/users/{userId}/*` tree where `request.auth.uid == userId`.
2. **Owner Id Consistency**: In every document, `ownerId` must match `request.auth.uid` and cannot be mutated after creation.
3. **Customer Accounts**: A customer record must have valid non-empty name, vehicle registration number, and numeric balances.
4. **Credit Entries**: Every credit entry must have positive numeric amount, valid non-empty customerId, and date.
5. **Payments**: Every payment must have positive numeric amount, valid non-empty customerId, paymentMethod, and date.
6. **Income & Expenses**: Every income and expense entry must have positive numeric amount, category, description, paymentMethod, and date.
7. **No Anonymous Or Unauthenticated Access**: All read and write operations require valid authenticated business owner credentials.

## 2. The Dirty Dozen Payloads (Designed to break invariants)
1. **Cross-Tenant Read**: User A attempts to list or get `/users/UserB/customers`. (Expected: PERMISSION_DENIED)
2. **Cross-Tenant Write**: User A attempts to create a document under `/users/UserB/customers/cust1`. (Expected: PERMISSION_DENIED)
3. **Spoofed OwnerId**: User A creates `/users/UserA/customers/cust1` with `ownerId: "UserB"`. (Expected: PERMISSION_DENIED)
4. **Mutated OwnerId on Update**: User A updates `/users/UserA/customers/cust1` changing `ownerId` to `"UserB"`. (Expected: PERMISSION_DENIED)
5. **Negative Amount in Credit**: User A creates a credit entry with `amount: -500`. (Expected: PERMISSION_DENIED)
6. **Negative Amount in Payment**: User A creates a payment with `amount: -1000`. (Expected: PERMISSION_DENIED)
7. **Negative Amount in Expense**: User A creates an expense with `amount: -250`. (Expected: PERMISSION_DENIED)
8. **Missing Required Fields**: User A creates a customer without `name` or `vehicleReg`. (Expected: PERMISSION_DENIED)
9. **Junk Long ID (Resource Exhaustion)**: Creating a document with ID longer than 128 characters or illegal characters. (Expected: PERMISSION_DENIED)
10. **Unauthenticated Access**: Guest (null auth) attempts to read any business data. (Expected: PERMISSION_DENIED)
11. **Negative Amount in Income**: User A creates an income entry with `amount: 0` or negative. (Expected: PERMISSION_DENIED)
12. **Malformed Types**: Passing a string for numeric `amount` in credit entry or expense. (Expected: PERMISSION_DENIED)
