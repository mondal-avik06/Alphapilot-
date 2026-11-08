# Alphapilot Frontend and Backend Presentation Script

**Recommended duration:** 8–10 minutes  
**Format:** 10 slides plus a short live demo  
**Audience:** Project reviewers, faculty, technical stakeholders, or teammates

---

## Slide 1 — Alphapilot Inventory Management System

### On the slide

- Local inventory management web application
- Responsive frontend and REST API backend
- Product, stock, sales, purchase, supplier, customer, reporting, and AI workflows

### Speaker script

“Good morning. Today I will present the frontend and backend work completed for Alphapilot, a locally runnable inventory management system. The application brings the main inventory workflows into one interface, including product management, stock tracking, sales records, purchase orders, suppliers, customers, reporting, multi-currency display, and an inventory assistant. I will first explain the user experience, then the backend architecture, and finally show how both layers work together.”

---

## Slide 2 — Project Scope and Architecture

### On the slide

`Browser UI → REST API → Validation and business logic → JSON datastore`

- Frontend: HTML, CSS, and vanilla JavaScript
- Backend: Node.js HTTP server
- Storage: persistent `data/inventory.json`
- Optional services: exchange-rate API and local Gemma 3 through Ollama

### Speaker script

“The project uses a simple full-stack architecture. The browser runs a single-page interface built with HTML, CSS, and vanilla JavaScript. It communicates with a Node.js server through REST endpoints under `/api`. The backend validates requests, applies inventory rules, and persists changes to a JSON datastore. This approach keeps the demo lightweight because it requires Node.js but no package installation or database server. Exchange rates come from an external service with offline fallback rates, while general assistant questions can use a local Gemma 3 model through Ollama.”

---

## Slide 3 — Frontend Application Shell

### On the slide

- Persistent sidebar and top navigation
- Hash-based navigation across ten application pages
- Responsive desktop and mobile layouts
- Light and dark themes stored in the browser
- Login session and automatic handling of unauthorized API responses

### Speaker script

“On the frontend, I created a reusable application shell with a sidebar, top bar, breadcrumbs, global search, notifications, account controls, and an AI assistant launcher. The interface switches between ten main pages without a full browser reload. The current page comes from the URL hash, which keeps navigation simple and makes each section directly accessible. The layout adapts to smaller screens, and users can switch between light and dark themes. Theme, currency, and dashboard preferences remain available through browser storage. The API client also attaches the session token to requests and returns the user to login if the backend rejects the session.”

---

## Slide 4 — Dashboard and Inventory Experience

### On the slide

- Live product, unit, value, and stock-alert metrics
- Inventory movement visualization and category breakdown
- Search, category and stock filters, sorting, and pagination
- Product creation, editing, deletion, bulk selection, and CSV export
- Manual stock adjustment with transaction history

### Speaker script

“The dashboard converts the raw inventory data into an operational summary. It shows product count, units on hand, average inventory value, and items that require attention. It also derives inventory movement from transaction history and displays stock distribution by category. In the product and inventory pages, users can search by product name, SKU, brand, or supplier. They can filter by category and stock condition, sort the results, and move through paginated data. The same interface supports creating and editing products, deleting records, exporting CSV files, and adjusting stock. Every stock adjustment appears in the stock movement history, so the user can see what changed and why.”

---

## Slide 5 — Business Workflows on the Frontend

### On the slide

- Supplier and customer management
- Sales entry with reference, customer, date, items, amount, status, and notes
- Purchase order creation and status tracking
- Reports based on live application state
- Primary currency selection across financial views and inputs

### Speaker script

“Beyond inventory, the frontend covers the supporting business workflows. Users can manage supplier and customer records, record sales, and create purchase orders. The sales form captures a unique reference, customer, date, item count, amount, status, and notes. Sales lists can be searched and exported. Purchase orders track the supplier, amount, date, and status. The reports page summarizes the same live data rather than using a separate static dataset. A currency setting updates monetary values throughout the dashboard, catalog, sales, purchases, reports, and assistant responses. Currency-denominated inputs convert back to the USD base value before the frontend sends them to the server.”

---

## Slide 6 — Frontend State and API Integration

### On the slide

- Central in-memory state for records, filters, preferences, and selection
- Parallel initial loading of eight API resources
- Shared API wrapper for JSON, authentication, and error handling
- Page-specific render functions and event binding
- Toast messages and validated modal forms for user feedback

### Speaker script

“The frontend keeps its data in a central state object. That state contains the records returned by the server, page filters, table selections, currency rates, theme choice, and assistant history. During startup, the application requests products, dashboard statistics, transactions, suppliers, customers, sales, purchases, and exchange rates in parallel. A shared API function handles JSON conversion, authorization headers, backend errors, and expired sessions. Each page has a dedicated render function, which makes the code easier to follow and lets the application re-render only after relevant state changes. Forms and modal dialogs provide immediate validation and toast messages confirm successful actions or explain errors.”

---

## Slide 7 — Backend REST API and Data Model

### On the slide

- REST resources for products, inventory, transactions, suppliers, customers, sales, and purchases
- Computed dashboard statistics and category counts
- Seed data for 50 products, 8 categories, 10 suppliers, and 10 customers
- Static-file delivery and API handling from one Node.js server

### Speaker script

“The backend uses the native Node.js HTTP module. It serves the frontend files and handles all API routes from the same process. The REST API provides CRUD operations for the main records and specialized endpoints for dashboard statistics, low-stock items, out-of-stock items, stock adjustments, categories, exchange rates, and assistant chat. On first launch, the server creates a realistic sample dataset with 50 products across eight categories, plus suppliers, customers, sales, purchase orders, and stock movements. Dashboard values are computed from the current datastore, so product counts, stock totals, valuation, alerts, revenue, and pending orders reflect saved changes.”

---

## Slide 8 — Validation, Persistence, and Safety

### On the slide

- Bearer token required for create, update, and delete requests
- Field, range, enum, date, and unique-reference validation
- Negative stock prevention and stock transaction audit entries
- One-megabyte request-body limit
- Serialized atomic datastore replacement and corrupt-file recovery

### Speaker script

“The backend does more than store incoming data. It validates product, supplier, customer, sale, purchase, and stock-adjustment requests before changing the datastore. It rejects duplicate SKUs and sales references, invalid numeric values, unsupported statuses, malformed dates, oversized requests, and any stock adjustment that would produce a negative quantity. Mutating requests require the local bearer token. Stock updates create ledger entries containing the previous value, new value, time, and note. For persistence, writes enter a serialized queue and the server replaces the datastore through a temporary file. This reduces the chance of overlapping writes or partially written JSON. If the datastore cannot be parsed at startup, the server preserves the damaged file and creates a fresh seeded dataset.”

---

## Slide 9 — Inventory Assistant

### On the slide

- Grounded answers for stock, valuation, sales, suppliers, categories, and orders
- Explicit commands for product creation and inventory updates
- Exact product-name or SKU matching for mutations
- Audit notes for AI-triggered stock changes
- Local language model reserved for general advisory questions

### Speaker script

“The assistant uses a layered design. Inventory questions first go through deterministic logic that reads the current datastore. This keeps answers about stock, valuation, suppliers, sales, categories, and purchase orders grounded in saved data. Explicit commands can create a product or update stock, reorder point, price, or cost. Mutations require a clear product name or SKU and pass through numeric validation before persistence. Stock changes also create audit entries containing the original prompt. If the request is a general advisory question rather than a supported inventory lookup or mutation, the backend can ask the local Gemma 3 model. The model receives a current inventory snapshot, but the prompt prevents it from claiming that it changed the database.”

---

## Slide 10 — Results, Limitations, and Next Steps

### On the slide

**Completed:** end-to-end local inventory workflows with persistent data  
**Current scope:** demonstration build, not production deployment  
**Next steps:** production authentication, database migration, role enforcement, testing, and deployment

### Speaker script

“The completed result is an end-to-end local inventory application. A user can log in, manage master data, adjust stock, record sales, track purchases, view reports, change currency, and use the assistant. Changes survive server restarts and immediately update the interface and dashboard calculations. The current build intentionally uses a JSON file and a lightweight demo token, so it does not yet provide password hashing, JWT-based sessions, role enforcement, a relational database, invoice generation, or production-grade security and audit controls. The logical next step would be to preserve the current user experience while replacing the demo authentication and JSON storage with a production backend, then add automated API and browser tests before deployment.”

---

## Suggested Live Demo — 2 to 3 minutes

### Demo sequence

1. Log in with the demo account.
2. Show the dashboard metrics and inventory alerts.
3. Open **Products**, search by SKU, and apply a low-stock filter.
4. Adjust one product’s stock and show the new transaction entry.
5. Record a sale or create a purchase order.
6. Change the primary currency and show the same values converted across pages.
7. Ask the assistant: “Which products are low in stock?”
8. Run an explicit command such as: “Set stock of STK-1008 to 25.”

### Demo narration

“I will now show the frontend and backend working together. The dashboard loads calculated values from the API. I can filter the product catalog and select a low-stock item. When I submit a stock adjustment, the frontend sends a validated request, the backend updates the product, saves the datastore, and creates a transaction entry. The refreshed page now shows the new quantity. I can also record sales and purchase orders through database-backed forms. When I change currency, the interface converts financial values consistently. Finally, the assistant can read the same live inventory and perform an explicit update. The resulting stock change appears in the normal transaction history, including an audit note.”

---

## Short Closing

“In summary, the frontend provides a responsive and complete inventory workflow, while the backend provides the API, validation, persistence, calculations, currency data, and guarded assistant actions. The project demonstrates the full request-response cycle from user interaction to saved business data. Thank you. I am ready for questions.”

---

## Likely Questions and Suggested Answers

### Why did you use vanilla JavaScript?

“The goal was a lightweight local build with no package installation. Vanilla JavaScript keeps the runtime simple while still demonstrating state management, reusable rendering, API integration, filtering, forms, and responsive behavior.”

### Is the login production-ready?

“No. It is a transparent demo login with a fixed local token. A production version should use hashed passwords, expiring sessions or JWTs, HTTPS, role enforcement, and secure secret management.”

### Why use JSON instead of MySQL?

“JSON makes the demonstration portable and easy to run. The API boundaries and validation layer already separate the browser from storage, so the datastore can later move to MySQL or another database without redesigning the frontend workflows.”

### How do you prevent incorrect AI updates?

“The language model does not directly write to the datastore. Explicit mutations go through deterministic parsing, product matching, field validation, range checks, negative-stock prevention, and the normal persistence layer.”

### What happens when the exchange-rate service is unavailable?

“The backend uses cached values for six hours and includes fallback rates, so the application remains usable offline. USD remains the base currency in storage.”
