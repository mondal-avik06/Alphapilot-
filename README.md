# Alphapilot local inventory demo

A locally runnable inventory management workspace based on the supplied project brief. It includes a responsive dashboard, searchable product catalog, category and stock filters, CSV export, product creation/editing, stock adjustments with transaction history, suppliers, customers, sales, purchases, basic reports, and an assistant that answers questions and performs validated inventory updates.

## Run locally

Requirements: Node.js 18 or newer. No npm packages or database server are required.

1. Open this project folder in a terminal.
2. Run `npm start`.
3. Open [http://localhost:3000](http://localhost:3000).

To choose another port in PowerShell: `$env:PORT=3001; npm start`.

## Demo login

Username: `admin`  
Password: `admin123`

The demo is intended for local testing only. Login is a lightweight local demo check and is not production authentication.

## Data and API

On first launch, the server creates 50 sample products, 8 categories, 10 suppliers, 10 customers, and sample sales, purchase orders, and stock movements. Updates are saved to `data/inventory.json` and remain available after restarting the server. Delete that file while the server is stopped to restore the original sample dataset.

The browser calls the local REST API at `/api`. Useful routes include:

- `GET /api/dashboard/stats`
- `GET, POST /api/products`; `GET, PUT, DELETE /api/products/:id`
- `GET /api/inventory`, `/api/inventory/low-stock`, `/api/inventory/out-of-stock`
- `POST /api/stock/adjust`; `GET /api/transactions`
- `GET /api/suppliers`, `/api/customers`, `/api/sales`, `/api/purchases`
- `GET /api/exchange-rates`
- `POST /api/ai/chat`

The assistant accepts explicit product mutations by full product name or SKU. Examples:

- `Set stock of STK-1001 to 40`
- `Add 10 to Wireless Mouse stock`
- `Remove 3 from STK-1008 stock`
- `Set the reorder point of Keyboard to 20`
- `Change the price of Desk Lamp to $29.99`
- `Add a new product named Wireless Keyboard with SKU STK-2001, category Electronics, stock 20, price 2500, cost 1800, reorder point 5`

Stock updates are written to the transaction ledger with the original prompt as an audit note. Negative stock and invalid numeric values are rejected.

The assistant uses a grounded intent layer for inventory facts before consulting the local language model. This keeps stock, valuation, product, supplier, sales, category, and purchase-order answers tied to the JSON datastore. Recent chat context supports follow-ups such as `Tell me about Keyboard` followed by `Set its stock to 25`. The local model is reserved for general advisory questions and is explicitly prevented from claiming database changes.

Mutating API requests require the local demo bearer token, request bodies are size-limited, product and stock values are validated, and datastore writes use serialized atomic replacement to reduce corruption risk.

Currency can be changed under **Settings → Primary Currency**. USD remains the database base currency; displayed amounts and currency-denominated inputs are converted using daily USD rates from [ExchangeRate-API](https://www.exchangerate-api.com), cached for six hours with offline fallback rates. The selection is stored in the browser and applies to dashboards, product prices, sales, purchases, reports, and AI responses. Supported options include USD, INR, BDT, NPR, PKR, LKR, GBP, EUR, JPY, CNY, KRW, AUD, CAD, SGD, AED, SAR, QAR, ZAR, NGN, KES, BRL, and MXN.

The **Sales Records** page provides a complete database-backed entry form for reference number, customer, date, line-item count, amount, status, and notes. References are unique, monetary inputs use the selected display currency, and saved records remain in `data/inventory.json` across restarts.

## Scope

This is a practical local testing build with a Node.js REST server and a JSON file store. It does not yet implement the full production brief: Spring Boot, MySQL, BCrypt/JWT and role enforcement, financial workflows, real AI-provider integration, invoice generation, or production-grade audit/security controls. No external API key is needed; the assistant uses guarded inventory lookup and mutation rules.
