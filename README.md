# SAMAYA Full App

Multi-branch hotel & restaurant operations platform built with:

- React + Vite
- ASP.NET Core Web API (.NET 10)
- Entity Framework Core 10
- MySQL 8
- JWT authentication

## Included in this build

- Organization registration/login
- Organization admin
- Branch creation and branch-scoped login
- Role-based users
- Branch isolation at API level
- Functional Inventory module
- Inventory items
- Opening stock
- Stock In / Stock Out
- Usage
- Wastage
- Adjustment
- Current stock calculation
- Minimum stock / low-stock status
- Stock movement audit trail
- Organization admin branch selector
- Branch users can only read/write inventory for their own branch

## Branch login behavior

A branch user receives `organizationId` and `branchId` in the JWT. Backend controllers enforce both organization and branch scope. A branch user cannot use an API request to access another branch by changing a query parameter or ID.

Organization Admin is organization-level and can switch inventory scope between branches.

## Run

### 1. MySQL

Create `samaya_db` and make sure the MySQL root password is known locally.

The API calls `EnsureCreatedAsync()` on startup for a fresh database and also creates the inventory tables idempotently, so a separate inventory migration is not required for this demo build.

You can also run `database/samaya_init.sql` manually.

### 2. Backend

```powershell
cd backend\Samaya.API
```

Edit `appsettings.json` and replace `YOUR_MYSQL_PASSWORD` with your local MySQL password.

```powershell
dotnet restore
dotnet build
dotnet run
```

API:

`http://localhost:5042`

### 3. Frontend

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL, normally:

`http://localhost:5173`

If 5173 is already occupied, Vite will automatically choose another port such as 5174.

## First-time use

1. Register an organization.
2. Sign in as the Organization Admin.
3. Open Branches and create branches.
4. Open Users and create a Branch Manager / Inventory Manager / Chef / Staff user and assign a branch.
5. Sign out.
6. Sign in with the branch user's email/password.
7. The branch user will only see and modify that assigned branch's inventory.
8. As Organization Admin, open Inventory → Add item and select a branch.
9. Add opening stock or record Stock In, Usage, Wastage, Stock Out and Adjustment.

## Example

Chicken:

- Opening: 50 KG
- Stock In: 20 KG
- Usage: 32 KG
- Wastage: 2 KG
- Current: 36 KG

The current quantity is maintained by the backend and every movement is recorded in `stock_transactions`.

## Waiter → Kitchen → Inventory workflow
- Organization Admin can create a **Waiter** user and assign the waiter to a branch.
- Admin/Branch Manager/Kitchen Manager can create branch menu items and recipe ingredients.
- Waiter logs in, selects the customer's table/reference and food items, then sends the order to the kitchen.
- Kitchen users see the branch queue and can mark orders **Preparing** and **Ready**.
- When an order is marked **Ready**, the backend validates the recipe and available stock, then records recipe-based **Usage** transactions and updates current inventory exactly once.
- Waiter clients poll for ready orders and show an in-app ready notification/count; the waiter can mark the order **Served**.
- All order, menu, recipe and inventory queries are organization/branch scoped.


## Super Admin

This build includes a global **Super Admin** inside the same SAMAYA application.

Default bootstrap credentials:

- Email: `superadmin@samaya.com`
- Password: `SuperAdmin@123`

Run `database/samaya_init.sql` on the database to create the bootstrap account.

Super Admin capabilities:
- View every organization
- View all organization branch/user counts
- View users across all organizations
- Filter the global user directory by organization
- Create users in any organization
- Delete another user's login
- Cannot delete the currently logged-in account

Organization Admin capabilities:
- View and manage users in their own organization
- Create users only inside their own organization
- Delete another user's login only inside their own organization
- Cannot manage users from another organization
- Cannot create a Super Admin

### User deletion behavior

The Delete Login action is intentionally safe for operational history:

- If the user has no historical stock/order references, the user row is permanently deleted.
- If historical records reference the user, the login is deactivated instead so inventory/order audit history remains intact.
- The `users` table is never dropped.

### Sign out

Every logged-in role has a **Sign out** button. It clears the JWT and local user session and returns to the login screen.
