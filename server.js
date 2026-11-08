import http from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, 'data');
const dbFile = process.env.DB_FILE ? path.resolve(process.env.DB_FILE) : path.join(dataDir, 'inventory.json');
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.ico':'image/x-icon', '.woff2':'font/woff2' };
const categories = ['Electronics','Office','Furniture','Accessories','Kitchen','Safety','Packaging','Tools'];
const names = ['Wireless Mouse','USB-C Hub','Desk Lamp','Notebook Set','Ergonomic Chair','HDMI Cable','Power Bank','Keyboard','Monitor Stand','Bluetooth Speaker','Webcam','Paper Ream','Steel Bottle','Label Printer','Safety Gloves','Storage Box','Desk Organizer','Ethernet Cable','Headset','Barcode Scanner','Laptop Stand','Packing Tape','Tool Kit','LED Bulb','Phone Charger','File Folder','Whiteboard','Router','Microphone','Cleaning Wipes','USB Drive','Surge Protector','Shipping Scale','Drawer Unit','Safety Vest','Card Reader','Tripod','Thermal Paper','Cable Ties','First Aid Kit','Document Tray','Battery Pack','Desk Fan','Mouse Pad','Portable SSD','Extension Cord','Packing Labels','Screwdriver Set','Water Filter','Mini Projector'];
const suppliers = ['Northstar Supply','Maple & Main','Vertex Wholesale','Harbor Goods','Summit Office Co.','Brightline Trading','Evergreen Industrial','Atlas Distribution','Cobalt Partners','Pioneer Products'];
const customers = ['Aster Labs','Bluebird Studio','Cedar Works','Daybreak Retail','Elm Street Office','Fieldnote Co.','Goodwin Group','Hearth & Home','Indigo Systems','Juniper House'];
async function seed(){
  const products = names.map((name,i)=>({id:i+1,name,sku:`STK-${String(1001+i)}`,category:categories[i%8],brand:['Northline','Forma','Kite','Fieldwork'][i%4],supplier:suppliers[i%10],price:Math.round((12+i*3.7)*100)/100,cost:Math.round((7+i*2.2)*100)/100,stock:(i*17+23)%142,minStock:12+(i%4)*4,unit:'each',location:['Main Warehouse','North Depot','South Store'][i%3]}));
  return {products,suppliers:suppliers.map((name,i)=>({id:i+1,name,contact:`${['Jordan','Sam','Riley','Alex','Casey'][i%5]} ${['Lee','Patel','Morgan','Kim','Shah'][i%5]}`,email:`orders${i+1}@example.test`,phone:`+1 555 01${String(i).padStart(2,'0')}`,status:'Active'})),customers:customers.map((name,i)=>({id:i+1,name,email:`hello${i+1}@example.test` })),transactions:Array.from({length:18},(_,i)=>({id:randomUUID(),productId:(i*3+1)%50+1,type:i%3===0?'Stock in':i%3===1?'Sale':'Adjustment',change:i%3===1?-((i%5)+1):((i%7)+2),date:new Date(Date.now()-i*3600_000*9).toISOString(),note:['Weekly replenishment','Counter sale','Cycle count'][i%3]})),sales:Array.from({length:16},(_,i)=>({id:randomUUID(),customer:customers[i%10],amount:128+(i*73)%620,date:new Date(Date.now()-i*86400000).toISOString(),items:1+i%5,status:'Completed'})),purchases:[{id:'PO-2041',supplier:suppliers[2],amount:1280,status:'Pending',date:new Date(Date.now()+86400000*3).toISOString()},{id:'PO-2040',supplier:suppliers[7],amount:640,status:'Ordered',date:new Date(Date.now()-86400000*2).toISOString()}],users:[{username:'admin',password:'admin123',name:'Alex Morgan',role:'Admin'}]};
}
const supportedCurrencies = new Set(['USD','INR','BDT','NPR','PKR','LKR','GBP','EUR','JPY','CNY','KRW','AUD','CAD','SGD','AED','SAR','QAR','ZAR','NGN','KES','BRL','MXN']);
function normalizeCurrency(value) { return supportedCurrencies.has(String(value || '').toUpperCase()) ? String(value).toUpperCase() : 'USD'; }
const fallbackRates = {USD:1,INR:94.620171,BDT:124.454493,NPR:151.394869,PKR:276.620523,LKR:332.16056,GBP:0.742316,EUR:0.889912,JPY:158.377906,CNY:6.685421,KRW:1340.311295,AUD:1.427647,CAD:1.396719,SGD:1.27882,AED:3.6725,SAR:3.75,QAR:3.64,ZAR:16.423516,NGN:1346.474525,KES:129.871619,BRL:5.468653,MXN:18.623318};
let exchangeRateCache = { rates: fallbackRates, updatedAt: null, source: 'fallback', fetchedAt: 0 };
async function getExchangeRates() {
  if (Date.now() - exchangeRateCache.fetchedAt < 6 * 60 * 60 * 1000) return exchangeRateCache;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', { signal: controller.signal });
    if (!response.ok) throw new Error(`Exchange-rate status ${response.status}`);
    const payload = await response.json();
    if (payload.result !== 'success' || !payload.rates) throw new Error('Invalid exchange-rate response');
    const rates = Object.fromEntries([...supportedCurrencies].map(code => [code, Number(payload.rates[code])]).filter(([,rate]) => Number.isFinite(rate) && rate > 0));
    exchangeRateCache = { rates: { ...fallbackRates, ...rates }, updatedAt: payload.time_last_update_utc || new Date().toISOString(), source: 'live', fetchedAt: Date.now() };
  } catch (error) {
    console.log('Using fallback exchange rates:', error.message);
    exchangeRateCache = { ...exchangeRateCache, fetchedAt: Date.now() };
  } finally {
    clearTimeout(timeoutId);
  }
  return exchangeRateCache;
}
function formatCurrency(value, currency = 'USD', rates = fallbackRates) { const code=normalizeCurrency(currency),converted=Number(value||0)*(Number(rates[code])||1);return new Intl.NumberFormat('en',{style:'currency',currency:code,minimumFractionDigits:2,maximumFractionDigits:2}).format(converted); }

async function queryLocalLlm(message, db, currency = 'USD', rates = fallbackRates, history = []) {
  const stock = db.products.reduce((a, p) => a + p.stock, 0);
  const value = db.products.reduce((a, p) => a + p.stock * p.cost, 0);
  const low = db.products.filter(p => p.stock > 0 && p.stock <= p.minStock);
  const out = db.products.filter(p => p.stock === 0);
  const top = [...db.products].sort((a, b) => b.stock - a.stock).slice(0, 5);
  const pending = db.purchases.filter(p => /pending|ordered/i.test(p.status));

  const prompt = `You are Alphapilot AI, an intelligent enterprise inventory assistant powered by local Gemma 3.
Live Inventory Snapshot:
- Total Products: ${db.products.length}
- Total Units in Stock: ${stock}
- Total Inventory Valuation: ${formatCurrency(value, currency, rates)}
- Low Stock Items (${low.length}): ${low.map(p => `${p.name} (${p.stock} on hand, min ${p.minStock})`).join(', ') || 'None'}
- Out of Stock Items (${out.length}): ${out.map(p => p.name).join(', ') || 'None'}
- Top Stocked: ${top.map(p => `${p.name} (${p.stock})`).join(', ')}
- Suppliers: ${db.suppliers.map(s => s.name).join(', ')}
- Pending Orders (${pending.length}): ${pending.map(p => `${p.id} from ${p.supplier} (${formatCurrency(p.amount, currency, rates)})`).join(', ') || 'None'}

Recent Conversation:
${history.slice(-6).map(item => `${item.role}: ${item.content}`).join('\n') || 'No previous messages.'}

User Question: "${message}"

Instructions:
- Provide an accurate, concise, and helpful response using the live inventory numbers above.
- Treat the inventory snapshot as the only source of truth. Do not invent products, quantities, prices, suppliers, or orders.
- Never claim that you changed inventory or completed an action. Database mutations are handled by a separate validated action layer.
- If the snapshot does not contain enough information, say so and suggest a specific supported query.
- Highlight specific items, numbers, or alerts using bullet points or bold text if helpful.
- Keep the tone professional and enterprise-grade.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma3:1b',
        prompt,
        stream: false
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`Ollama status ${res.status}`);
    const data = await res.json();
    return data.response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

function findProductFromMessage(message, products, history = []) {
  const normalized = message.toLowerCase();
  const sku = (message.match(/\b[A-Z]{3}-?\d{3,}\b/i) || [])[0];
  if (sku) {
    const product = products.find(p => p.sku.toLowerCase() === sku.toLowerCase());
    if (product) return product;
  }
  const directMatch = [...products]
    .sort((a, b) => b.name.length - a.name.length)
    .find(p => normalized.includes(p.name.toLowerCase()));
  if (directMatch) return directMatch;
  if (!/\b(it|its|that product|this product)\b/i.test(message)) return null;
  const context = history.slice(-6).map(item => String(item?.content || '')).join(' ').toLowerCase();
  return [...products].sort((a,b)=>b.name.length-a.name.length).find(p => context.includes(p.sku.toLowerCase()) || context.includes(p.name.toLowerCase())) || null;
}

function parseNumber(value) {
  const number = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(number) ? number : null;
}

function plainText(value, maxLength = 120) {
  return String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function validateProductInput(input, partial = false) {
  const allowed = ['name','sku','category','brand','supplier','price','cost','stock','minStock','unit','location'];
  const clean = Object.fromEntries(allowed.filter(key => input[key] !== undefined).map(key => [key,input[key]]));
  for (const field of ['name','sku','category','brand','supplier','unit','location']) {
    if (clean[field] !== undefined) clean[field] = plainText(clean[field]);
  }
  if ((!partial && (!clean.name || !clean.sku)) || (input.name !== undefined && !clean.name) || (input.sku !== undefined && !clean.sku)) { const error=new Error('Name and SKU are required');error.status=400;throw error; }
  if (clean.sku !== undefined && !/^[A-Z0-9][A-Z0-9-]{2,31}$/i.test(clean.sku)) { const error=new Error('SKU must contain 3–32 letters, numbers, or hyphens');error.status=400;throw error; }
  for (const field of ['price','cost']) if (clean[field] !== undefined) { clean[field]=Number(clean[field]);if(!Number.isFinite(clean[field])||clean[field]<0||clean[field]>1_000_000_000){const error=new Error(`${field} must be a valid non-negative number`);error.status=400;throw error;}clean[field]=Math.round(clean[field]*1_000_000)/1_000_000; }
  for (const field of ['stock','minStock']) if (clean[field] !== undefined) { clean[field]=Number(clean[field]);if(!Number.isInteger(clean[field])||clean[field]<0||clean[field]>1_000_000_000){const error=new Error(`${field} must be a non-negative whole number`);error.status=400;throw error;} }
  return clean;
}

function validateEmail(value) {
  const email=plainText(value,160);
  if(email&&email!=='—'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){const error=new Error('Enter a valid email address');error.status=400;throw error;}
  return email||'—';
}
function validateSupplierInput(input, partial=false){
  const result={};
  if(input.name!==undefined)result.name=plainText(input.name);
  if((!partial&&!result.name)||(input.name!==undefined&&!result.name)){const error=new Error('Supplier name is required');error.status=400;throw error;}
  if(input.contact!==undefined)result.contact=plainText(input.contact)||'—';
  if(input.email!==undefined)result.email=validateEmail(input.email);
  if(input.phone!==undefined)result.phone=plainText(input.phone,40)||'—';
  if(input.status!==undefined){if(!['Active','Inactive'].includes(input.status)){const error=new Error('Invalid supplier status');error.status=400;throw error;}result.status=input.status;}
  return result;
}
function validateCustomerInput(input, partial=false){
  const result={};
  if(input.name!==undefined)result.name=plainText(input.name);
  if((!partial&&!result.name)||(input.name!==undefined&&!result.name)){const error=new Error('Customer name is required');error.status=400;throw error;}
  if(input.email!==undefined)result.email=validateEmail(input.email);
  return result;
}
function validatePurchaseInput(input, partial=false){
  const result={};
  if(input.supplier!==undefined)result.supplier=plainText(input.supplier);
  if(input.amount!==undefined){result.amount=Number(input.amount);if(!Number.isFinite(result.amount)||result.amount<0||result.amount>1_000_000_000){const error=new Error('Enter a valid non-negative purchase amount');error.status=400;throw error;}result.amount=Math.round(result.amount*1_000_000)/1_000_000;}
  if(input.status!==undefined){if(!['Pending','Ordered','Partially Received','Received','Cancelled'].includes(input.status)){const error=new Error('Invalid purchase status');error.status=400;throw error;}result.status=input.status;}
  if(input.date!==undefined){const date=new Date(input.date);if(Number.isNaN(date.getTime())){const error=new Error('Enter a valid purchase date');error.status=400;throw error;}result.date=date.toISOString();}
  if(!partial&&!result.supplier)result.supplier=db.suppliers[0]?.name||'Supplier';
  return result;
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-8).map(item => ({
    role: item?.role === 'assistant' ? 'assistant' : 'user',
    content: String(item?.content || '').slice(0, 600)
  })).filter(item => item.content.trim());
}

function answerInventoryQuery(message, currency = 'USD', rates = fallbackRates, history = []) {
  const m=message.toLowerCase().trim();
  const money=n=>formatCurrency(n,currency,rates);
  let answer=null,intent=null;
  const requestedProduct=findProductFromMessage(message,db.products,history);
  if(requestedProduct&&/\b(?:amount|stock|quantity|on[ -]?hand|available|how many)\b/.test(m)){
    answer=`${requestedProduct.name} (${requestedProduct.sku}) has ${requestedProduct.stock.toLocaleString()} ${requestedProduct.unit} in stock.`;
    intent='product_stock';
  }
  else if(requestedProduct&&/\b(?:price|selling price)\b/.test(m)){answer=`${requestedProduct.name} (${requestedProduct.sku}) has a selling price of ${money(requestedProduct.price)}.`;intent='product_price';}
  else if(requestedProduct&&/\b(?:cost|unit cost)\b/.test(m)){answer=`${requestedProduct.name} (${requestedProduct.sku}) has a unit cost of ${money(requestedProduct.cost)}.`;intent='product_cost';}
  else if(/out of stock|no stock|zero stock/.test(m)){const a=db.products.filter(p=>!p.stock);answer=a.length?`${a.length} products are out of stock: ${a.map(p=>`${p.name} (${p.sku})`).join(', ')}.`:'There are no out-of-stock products.';intent='out_of_stock';}
  else if(/low stock|running low|restock needs?|reorder alerts?|need to buy/.test(m)){const a=db.products.filter(p=>p.stock<=p.minStock);answer=a.length?`I found ${a.length} product${a.length===1?'':'s'} at or below their reorder point: ${a.slice(0,10).map(p=>`${p.name} (${p.stock} on hand, reorder at ${p.minStock})`).join('; ')}.`:'No products are currently below their reorder point.';intent='low_stock';}
  else if(/inventory value|stock value|worth|valuation/.test(m)){answer=`Current inventory cost value is ${money(db.products.reduce((a,p)=>a+p.stock*p.cost,0))}.`;intent='inventory_value';}
  else if(/how many|total products|product count|units on hand|available units/.test(m)){answer=`There are ${db.products.length} products and ${db.products.reduce((a,p)=>a+p.stock,0).toLocaleString()} units on hand.`;intent='inventory_count';}
  else if(/highest|most stock|largest stock|top stock/.test(m)){const a=[...db.products].sort((x,y)=>y.stock-x.stock).slice(0,5);answer=`Highest stock levels: ${a.map(p=>`${p.name} (${p.stock})`).join(', ')}.`;intent='highest_stock';}
  else if(/lowest stock|least stock|smallest stock/.test(m)){const a=[...db.products].filter(p=>p.stock>0).sort((x,y)=>x.stock-y.stock).slice(0,5);answer=`Lowest available stock: ${a.map(p=>`${p.name} (${p.stock})`).join(', ')}.`;intent='lowest_stock';}
  else if(/pending|purchase orders?|incoming order/.test(m)){const a=db.purchases.filter(p=>/pending|ordered|partially/i.test(p.status));answer=a.length?`${a.length} purchase orders need attention: ${a.map(p=>`${p.id} from ${p.supplier} (${p.status}, ${money(p.amount)})`).join('; ')}.`:'There are no pending purchase orders.';intent='pending_purchases';}
  else if(/sales|revenue|sold|orders today|today['’]s/.test(m)){const today=new Date().toDateString(),a=db.sales.filter(s=>(s.status||'Completed')==='Completed'&&new Date(s.date).toDateString()===today),total=a.reduce((n,s)=>n+s.amount,0);answer=`Today’s sales: ${money(total)} across ${a.length} completed order${a.length===1?'':'s'}.`;intent='sales_today';}
  else if(/supplier|vendor/.test(m)){const s=db.suppliers.find(x=>m.includes(x.name.toLowerCase()));answer=s?`${s.name}: contact ${s.contact}, ${s.email}, ${s.phone}. Status: ${s.status}.`:`There are ${db.suppliers.length} suppliers. They include ${db.suppliers.slice(0,5).map(x=>x.name).join(', ')}.`;intent='suppliers';}
  else if(/category|electronics|office|furniture|accessories|kitchen|safety|packaging|tools/.test(m)){const cat=categories.find(c=>m.includes(c.toLowerCase()));if(cat){const a=db.products.filter(p=>p.category===cat);answer=`${cat} has ${a.length} products and ${a.reduce((n,p)=>n+p.stock,0).toLocaleString()} units on hand.`;}else{answer=categories.map(c=>`${c}: ${db.products.filter(p=>p.category===c).length}`).join(' · ')+'.';}intent='category_summary';}
  else if(/sku|stock|quantity|details|tell me about|product|price|cost/.test(m)){const p=findProductFromMessage(message,db.products,history);if(p){answer=`${p.name} (${p.sku}) — ${p.stock} ${p.unit} in stock, reorder at ${p.minStock}. Category: ${p.category}; supplier: ${p.supplier}; selling price: ${money(p.price)}; unit cost: ${money(p.cost)}.`;intent='product_details';}}
  return answer ? {answer,intent,grounded:true} : null;
}

async function executeAiProductCreation(message, currency = 'USD', rates = fallbackRates) {
  if (!/\b(?:add|create|register)\s+(?:a\s+|an\s+)?(?:new\s+)?product\b/i.test(message)) return null;
  const skuMatch=message.match(/\bsku\s*(?:is|:|=)?\s*([A-Z0-9][A-Z0-9-]{2,31})\b/i);
  const nameMatch=message.match(/\b(?:add|create|register)\s+(?:a\s+|an\s+)?(?:new\s+)?product\s+(?:named?\s+|called\s+)?(.+?)(?=\s+(?:with\s+)?sku\b|,\s*sku\b|$)/i);
  const name=String(nameMatch?.[1]||'').replace(/[,.]+$/,'').trim();
  const sku=String(skuMatch?.[1]||'').toUpperCase();
  if(!name||!sku){
    return {
      answer:'To add a product, include at least its name and SKU. Use this format:\n\nAdd a new product named Wireless Keyboard with SKU STK-2001, category Electronics, stock 20, price 2500, cost 1800, reorder point 5.\n\nOptional details: brand, supplier, warehouse location, and unit.',
      changed:false,
      intent:'create_product_help'
    };
  }
  if(db.products.some(p=>p.sku.toLowerCase()===sku.toLowerCase()))return {answer:`A product with SKU ${sku} already exists. Use a unique SKU or ask me to update the existing product.`,changed:false,intent:'create_product'};

  const numberAfter = label => {
    const match=message.match(new RegExp(`\\b${label}\\b\\s*(?:is|:|=|of)?\\s*[^\\d]*([\\d,.]+)`,'i'));
    return match?parseNumber(match[1]):null;
  };
  const stock=numberAfter('(?:initial\\s+)?stock')??0;
  const minStock=numberAfter('(?:reorder(?:\\s+point)?|minimum\\s+stock|min\\s+stock)')??10;
  const enteredPrice=numberAfter('(?:selling\\s+)?price')??0;
  const enteredCost=numberAfter('(?:unit\\s+|purchase\\s+)?cost')??0;
  const category=categories.find(value=>new RegExp(`\\b${value}\\b`,'i').test(message))||'Office';
  const supplier=db.suppliers.find(value=>message.toLowerCase().includes(value.name.toLowerCase()))?.name||db.suppliers[0]?.name||'Supplier';
  const locations=['Main Warehouse','North Depot','South Store'];
  const location=locations.find(value=>message.toLowerCase().includes(value.toLowerCase()))||'Main Warehouse';
  const brandMatch=message.match(/\bbrand\s*(?:is|:|=)?\s*([^,.;]+?)(?=\s+(?:supplier|stock|price|cost|category|location|warehouse|reorder)\b|[,.;]|$)/i);
  const unitMatch=message.match(/\bunit\s*(?:is|:|=)?\s*([a-zA-Z-]+)/i);
  const rate=Number(rates[normalizeCurrency(currency)])||1;
  const candidate={
    name,sku,category,
    brand:String(brandMatch?.[1]||'').trim(),
    supplier,
    price:enteredPrice/rate,
    cost:enteredCost/rate,
    stock,
    minStock,
    unit:String(unitMatch?.[1]||'each').toLowerCase(),
    location
  };
  let clean;
  try{clean=validateProductInput(candidate);}catch(error){return {answer:`I could not add ${name}: ${error.message}.`,changed:false,intent:'create_product'};}
  const product={id:Math.max(...db.products.map(p=>p.id),0)+1,...clean};
  db.products.unshift(product);
  if(product.stock>0)db.transactions.unshift({id:randomUUID(),productId:product.id,type:'Stock in',change:product.stock,date:new Date().toISOString(),note:`AI assistant created product ${product.sku}`,previous:0,next:product.stock});
  await persist();
  return {
    answer:`Added ${product.name} (${product.sku}) to inventory.\n\n• Category: ${product.category}\n• Opening stock: ${product.stock} ${product.unit}\n• Selling price: ${formatCurrency(product.price,currency,rates)}\n• Unit cost: ${formatCurrency(product.cost,currency,rates)}\n• Reorder point: ${product.minStock}\n• Location: ${product.location}`,
    changed:true,
    intent:'create_product',
    change:{action:'create',productId:product.id,sku:product.sku}
  };
}

async function executeAiMutation(message, currency = 'USD', rates = fallbackRates, history = []) {
  const text = message.trim();
  const product = findProductFromMessage(text, db.products, history);
  const mutationWords = /\b(set|update|change|add|increase|restock|remove|reduce|decrease|deduct|sold)\b/i;
  const inventoryFields = /\b(stock|quantity|units?|on[ -]?hand|reorder(?: point)?|minimum stock|min stock|selling price|price|unit cost|cost)\b/i;
  if (!mutationWords.test(text) || !inventoryFields.test(text)) return null;
  if (!product) {
    return { answer: 'I can make that change, but I could not identify the product. Include its full name or SKU, for example: “Set stock of STK-1001 to 40”.', changed: false };
  }

  let match;
  let field;
  let value;
  let mode = 'set';

  match = text.match(/\b(?:set|update|change)\b[\s\S]*?\b(?:reorder(?: point)?|minimum stock|min stock)\b[\s\S]*?\bto\s+([\d,]+)\b/i);
  if (match) {
    field = 'minStock';
    value = parseNumber(match[1]);
  }

  if (!field) {
    match = text.match(/\b(?:set|update|change)\b[\s\S]*?\b(?:selling price|price)\b[\s\S]*?\bto\s+[^\d]*([\d,.]+)\b/i);
    if (match) {
      field = 'price';
      value = parseNumber(match[1]);
    }
  }

  if (!field) {
    match = text.match(/\b(?:set|update|change)\b[\s\S]*?\b(?:unit cost|cost)\b[\s\S]*?\bto\s+[^\d]*([\d,.]+)\b/i);
    if (match) {
      field = 'cost';
      value = parseNumber(match[1]);
    }
  }

  if (!field) {
    match = text.match(/\b(?:set|update|change)\b[\s\S]*?\b(?:stock|quantity|on[ -]?hand)\b[\s\S]*?\bto\s+([\d,]+)\b/i);
    if (match) {
      field = 'stock';
      value = parseNumber(match[1]);
    }
  }

  if (!field) {
    match = text.match(/\b(add|increase|restock|remove|reduce|decrease|deduct)\b[\s\S]*?\bby\s+([\d,]+)\b/i)
      || text.match(/\b(add|increase|restock|remove|reduce|decrease|deduct)\b\s+([\d,]+)\b/i);
    if (match) {
      field = 'stock';
      value = parseNumber(match[2]);
      mode = /remove|reduce|decrease|deduct/i.test(match[1]) ? 'decrease' : 'increase';
    }
  }

  if (!field) {
    match = text.match(/\bsold\s+([\d,]+)\s*(?:units?|items?|pieces?|pcs?)?\b/i);
    if (match) {
      field = 'stock';
      value = parseNumber(match[1]);
      mode = 'decrease';
    }
  }

  if (!field || value === null) {
    return { answer: `I found ${product.name}, but the requested value was unclear. Try “Set stock of ${product.sku} to 40” or “Add 10 to ${product.sku} stock”.`, changed: false };
  }
  if (value < 0 || value > 1_000_000_000 || ((field === 'stock' || field === 'minStock') && !Number.isInteger(value))) {
    return { answer: `${field === 'price' || field === 'cost' ? 'Prices' : 'Stock values'} must be non-negative${field === 'stock' || field === 'minStock' ? ' whole numbers' : ''}.`, changed: false };
  }

  if (field === 'price' || field === 'cost') value /= Number(rates[normalizeCurrency(currency)]) || 1;

  const previous = product[field];
  let next = mode === 'increase' ? previous + value : mode === 'decrease' ? previous - value : value;
  if (next < 0) return { answer: `That change would make ${product.name}'s stock negative. Current stock is ${product.stock}.`, changed: false };
  if (field === 'price' || field === 'cost') next = Math.round(next * 1_000_000) / 1_000_000;
  if (next === previous) return { answer: `${product.name} (${product.sku}) already has that value. No change was made.`, changed: false };

  product[field] = next;
  if (field === 'stock') {
    db.transactions.unshift({
      id: randomUUID(),
      productId: product.id,
      type: next > previous ? 'Stock in' : 'Stock out',
      change: next - previous,
      date: new Date().toISOString(),
      note: `AI assistant: ${text}`,
      previous,
      next
    });
  }
  await persist();

  const labels = { stock: 'stock', minStock: 'reorder point', price: 'selling price', cost: 'unit cost' };
  const format = n => field === 'price' || field === 'cost' ? formatCurrency(n, currency, rates) : n.toLocaleString();
  return {
    answer: `Updated ${product.name} (${product.sku}) ${labels[field]} from ${format(previous)} to ${format(next)}.`,
    changed: true,
    change: { productId: product.id, sku: product.sku, field, previous, next }
  };
}

let db;
let persistQueue=Promise.resolve();
async function persist(){
  const snapshot=JSON.stringify(db,null,2);
  persistQueue=persistQueue.catch(()=>{}).then(async()=>{
    const tempFile=`${dbFile}.tmp`;
    await writeFile(tempFile,snapshot);
    await rename(tempFile,dbFile);
  });
  return persistQueue;
}
async function init(){
  await mkdir(path.dirname(dbFile),{recursive:true});
  try{db=JSON.parse(await readFile(dbFile,'utf8'));}
  catch(error){
    if(error.code!=='ENOENT'){
      const backup=`${dbFile}.corrupt-${Date.now()}`;
      try{await rename(dbFile,backup);console.error(`Invalid datastore moved to ${backup}`);}catch{}
    }
    db=await seed();await persist();
  }
}
function send(res,status,obj){res.writeHead(status,{'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(obj));}
async function body(req){let s='';for await(const c of req){s+=c;if(s.length>1_000_000){const error=new Error('Request body is too large');error.status=413;throw error;}}try{return s?JSON.parse(s):{};}catch{const error=new Error('Invalid JSON request body');error.status=400;throw error;}}
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PUT,DELETE,OPTIONS','access-control-allow-headers':'content-type, authorization'});return res.end();}
  try{
    if(url.pathname.startsWith('/api/')){
      if(req.method==='POST'&&url.pathname==='/api/auth/login'){const x=await body(req),u=db.users.find(y=>y.username===x.username&&y.password===x.password);return u?send(res,200,{token:'local-demo-token',user:{name:u.name,role:u.role,username:u.username}}):send(res,401,{error:'Username or password is incorrect'});}
      if(['POST','PUT','DELETE'].includes(req.method)&&req.headers.authorization!=='Bearer local-demo-token')return send(res,401,{error:'Authentication required'});
      if(url.pathname==='/api/dashboard/stats'){const stock=db.products.reduce((a,p)=>a+p.stock,0);return send(res,200,{products:db.products.length,units:stock,value:db.products.reduce((a,p)=>a+p.stock*p.cost,0),low:db.products.filter(p=>p.stock>0&&p.stock<=p.minStock).length,out:db.products.filter(p=>p.stock===0).length,suppliers:db.suppliers.length,sales:db.sales.filter(s=>s.status==='Completed').reduce((a,s)=>a+s.amount,0),pending:db.purchases.filter(p=>p.status==='Pending').length});}
      if(url.pathname==='/api/products'&&req.method==='GET'){let a=[...db.products],q=(url.searchParams.get('q')||'').toLowerCase(),cat=url.searchParams.get('category'),status=url.searchParams.get('status');if(q)a=a.filter(p=>(p.name+' '+p.sku+' '+p.category).toLowerCase().includes(q));if(cat&&cat!=='All categories')a=a.filter(p=>p.category===cat);if(status==='Low stock')a=a.filter(p=>p.stock<=p.minStock&&p.stock>0);if(status==='Out of stock')a=a.filter(p=>p.stock===0);return send(res,200,a);}
      if(url.pathname==='/api/products'&&req.method==='POST'){const x=validateProductInput(await body(req));if(db.products.some(p=>p.sku.toLowerCase()===x.sku.toLowerCase()))return send(res,409,{error:'SKU already exists'});let p={id:Math.max(...db.products.map(p=>p.id),0)+1,category:'Office',brand:'',supplier:db.suppliers[0].name,price:0,cost:0,stock:0,minStock:10,unit:'each',location:'Main Warehouse',...x};db.products.unshift(p);await persist();return send(res,201,p);}
      const pMatch=url.pathname.match(/^\/api\/products\/(\d+)$/);if(pMatch){const i=db.products.findIndex(p=>p.id===+pMatch[1]);if(i<0)return send(res,404,{error:'Product not found'});if(req.method==='GET')return send(res,200,db.products[i]);if(req.method==='PUT'){const patch=validateProductInput(await body(req),true);if(patch.sku&&db.products.some((p,index)=>index!==i&&p.sku.toLowerCase()===patch.sku.toLowerCase()))return send(res,409,{error:'SKU already exists'});db.products[i]={...db.products[i],...patch};await persist();return send(res,200,db.products[i]);}if(req.method==='DELETE'){db.products.splice(i,1);await persist();return send(res,200,{ok:true});}}
      if(url.pathname==='/api/inventory'&&req.method==='GET')return send(res,200,db.products);
      if(url.pathname==='/api/inventory/low-stock')return send(res,200,db.products.filter(p=>p.stock<=p.minStock&&p.stock>0));
      if(url.pathname==='/api/inventory/out-of-stock')return send(res,200,db.products.filter(p=>p.stock===0));
      if(url.pathname==='/api/transactions')return send(res,200,db.transactions);
      if(url.pathname==='/api/stock/adjust'&&req.method==='POST'){const x=await body(req),p=db.products.find(p=>p.id===+x.productId);if(!p)return send(res,404,{error:'Product not found'});const qty=Number(x.quantity);if(!Number.isInteger(qty)||qty===0||Math.abs(qty)>1_000_000_000)return send(res,400,{error:'Enter a non-zero whole number within the supported range'});if(p.stock+qty<0)return send(res,400,{error:'Adjustment would make stock negative'});const previous=p.stock;p.stock+=qty;const t={id:randomUUID(),productId:p.id,type:qty>0?'Stock in':'Stock out',change:qty,date:new Date().toISOString(),note:plainText(x.note||'Manual stock adjustment',240),previous,next:p.stock};db.transactions.unshift(t);await persist();return send(res,201,{product:p,transaction:t});}
      if(url.pathname==='/api/suppliers'&&req.method==='GET')return send(res,200,db.suppliers);
      if(url.pathname==='/api/suppliers'&&req.method==='POST'){const x=validateSupplierInput(await body(req));let s={id:Math.max(...db.suppliers.map(y=>y.id),0)+1,contact:'—',email:'—',phone:'—',status:'Active',...x};db.suppliers.unshift(s);await persist();return send(res,201,s);}
      const supMatch=url.pathname.match(/^\/api\/suppliers\/(\d+)$/);if(supMatch){const idx=db.suppliers.findIndex(y=>y.id===+supMatch[1]);if(idx<0)return send(res,404,{error:'Supplier not found'});if(req.method==='GET')return send(res,200,db.suppliers[idx]);if(req.method==='PUT'){db.suppliers[idx]={...db.suppliers[idx],...validateSupplierInput(await body(req),true)};await persist();return send(res,200,db.suppliers[idx]);}if(req.method==='DELETE'){db.suppliers.splice(idx,1);await persist();return send(res,200,{ok:true});}}

      if(url.pathname==='/api/customers'&&req.method==='GET')return send(res,200,db.customers);
      if(url.pathname==='/api/customers'&&req.method==='POST'){const x=validateCustomerInput(await body(req));let c={id:Math.max(...db.customers.map(y=>y.id),0)+1,email:'—',...x};db.customers.unshift(c);await persist();return send(res,201,c);}
      const custMatch=url.pathname.match(/^\/api\/customers\/(\d+)$/);if(custMatch){const idx=db.customers.findIndex(y=>y.id===+custMatch[1]);if(idx<0)return send(res,404,{error:'Customer not found'});if(req.method==='GET')return send(res,200,db.customers[idx]);if(req.method==='PUT'){db.customers[idx]={...db.customers[idx],...validateCustomerInput(await body(req),true)};await persist();return send(res,200,db.customers[idx]);}if(req.method==='DELETE'){db.customers.splice(idx,1);await persist();return send(res,200,{ok:true});}}

      if(url.pathname==='/api/sales'&&req.method==='GET')return send(res,200,db.sales);
      if(url.pathname==='/api/sales'&&req.method==='POST'){
        const x=await body(req),customer=plainText(x.customer),reference=plainText(x.reference,40),amount=Number(x.amount),items=Number(x.items),date=new Date(x.date||Date.now()),status=String(x.status||'Completed'),productId=Number(x.productId);
        if(!customer)return send(res,400,{error:'Customer is required'});
        if(!reference||!/^[-A-Z0-9_/]{3,40}$/i.test(reference))return send(res,400,{error:'Enter a valid sales reference'});
        if(db.sales.some(s=>String(s.reference||'').toLowerCase()===reference.toLowerCase()))return send(res,409,{error:'Sales reference already exists'});
        if(!Number.isFinite(amount)||amount<0||amount>1_000_000_000)return send(res,400,{error:'Enter a valid non-negative sales amount'});
        if(!Number.isInteger(items)||items<1||items>1_000_000)return send(res,400,{error:'Units sold must be a positive whole number'});
        if(Number.isNaN(date.getTime()))return send(res,400,{error:'Enter a valid sale date'});
        if(!['Completed','Pending','Cancelled','Refunded'].includes(status))return send(res,400,{error:'Invalid sales status'});
        const product=db.products.find(p=>p.id===productId);
        if(!product)return send(res,400,{error:'Select a valid product'});
        if(status==='Completed'&&product.stock<items)return send(res,400,{error:`Only ${product.stock} ${product.unit} of ${product.name} are available`});
        const s={id:randomUUID(),reference,customer,productId:product.id,productName:product.name,sku:product.sku,amount:Math.round(amount*1_000_000)/1_000_000,date:date.toISOString(),items,status,notes:plainText(x.notes,500)};
        if(status==='Completed'){
          const previous=product.stock;
          product.stock-=items;
          db.transactions.unshift({id:randomUUID(),productId:product.id,type:'Sale',change:-items,date:date.toISOString(),note:`Sale ${reference} to ${customer}`,previous,next:product.stock});
        }
        db.sales.unshift(s);await persist();return send(res,201,s);
      }

      if(url.pathname==='/api/purchases'&&req.method==='GET')return send(res,200,db.purchases);
      if(url.pathname==='/api/purchases'&&req.method==='POST'){const x=validatePurchaseInput(await body(req));const maxNum=Math.max(...db.purchases.map(p=>parseInt(String(p.id).replace(/\D/g,''))||2040),2040);let p={id:`PO-${maxNum+1}`,amount:0,status:'Pending',date:new Date().toISOString(),...x};db.purchases.unshift(p);await persist();return send(res,201,p);}
      const poMatch=url.pathname.match(/^\/api\/purchases\/(PO-[\w\d]+)$/i);if(poMatch){const idx=db.purchases.findIndex(y=>y.id.toLowerCase()===poMatch[1].toLowerCase());if(idx<0)return send(res,404,{error:'Purchase order not found'});if(req.method==='GET')return send(res,200,db.purchases[idx]);if(req.method==='PUT'){db.purchases[idx]={...db.purchases[idx],...validatePurchaseInput(await body(req),true)};await persist();return send(res,200,db.purchases[idx]);}if(req.method==='DELETE'){db.purchases.splice(idx,1);await persist();return send(res,200,{ok:true});}}
      if(url.pathname==='/api/categories')return send(res,200,categories.map(name=>({name,count:db.products.filter(p=>p.category===name).length})));
      if(url.pathname==='/api/exchange-rates'&&req.method==='GET'){const rates=await getExchangeRates();return send(res,200,{base:'USD',...rates});}
      if(url.pathname==='/api/ai/chat'&&req.method==='POST'){
        const {message,currency:requestedCurrency,history:rawHistory}=await body(req);
        const currency=normalizeCurrency(requestedCurrency);
        const {rates}=await getExchangeRates();
        const history=sanitizeHistory(rawHistory);
        if(!message||!message.trim()) return send(res,200,{answer:'Ask me about stock, products, sales, suppliers, purchase orders, or inventory value.'});
        if(String(message).length>2000)return send(res,400,{error:'Message is too long. Keep inventory requests under 2,000 characters.'});
        const normalizedMessage=message.toLowerCase().trim();
        if(/^(help|commands|what can you do|what do you do|show me what you can do)[?.!\s]*$/i.test(normalizedMessage)){
          return send(res,200,{
            answer:'I can analyze and update your live inventory. Try commands such as:\n\n• “Which products are low in stock?”\n• “What is the inventory value?”\n• “Set stock of STK-1008 to 25”\n• “Add 10 to Wireless Mouse stock”\n• “Set the reorder point of Keyboard to 20”\n• “Change the price of Desk Lamp to 2500”\n• “Add a new product named Wireless Keyboard with SKU STK-2001, category Electronics, stock 20, price 2500, cost 1800, reorder point 5”\n\nUse a product’s exact name or SKU when making changes.',
            intent:'help'
          });
        }
        if(/^(hello|hi|hey|good morning|good afternoon|good evening|namaste|assalamu alaikum|salam)[?.!\s]*$/i.test(normalizedMessage)){
          return send(res,200,{
            answer:'Hello Alex! 👋 I’m ready to help with your inventory. You can ask me about stock levels, valuation, sales, suppliers, or tell me to update a product. Type “help” to see example commands.',
            intent:'greeting'
          });
        }
        const creation=await executeAiProductCreation(message,currency,rates);
        if(creation)return send(res,200,creation);
        const mutation = await executeAiMutation(message, currency, rates, history);
        if (mutation) return send(res, 200, mutation);
        const groundedAnswer=answerInventoryQuery(message,currency,rates,history);
        if(groundedAnswer) return send(res,200,groundedAnswer);
        try {
          const aiAnswer = await queryLocalLlm(message, db, currency, rates, history);
          if (aiAnswer) return send(res, 200, { answer: aiAnswer, model: 'gemma3:1b', grounded:false });
        } catch(err) {
          console.log('Local Gemma 3 query bypassed:', err.message);
        }
        const m=(message||'').toLowerCase().trim(),money=n=>formatCurrency(n,currency,rates);
        let answer;
        if(/help|what can|commands|what do you do/.test(m)){answer='I can answer inventory questions and make explicit product updates. Try: “What is the stock of STK-1001?”, “Set stock of STK-1001 to 40”, “Add 10 to Wireless Mouse stock”, “Set the reorder point of STK-1008 to 20”, or “Change the price of Desk Lamp to $29.99”.';}
        else if(/out of stock|no stock|zero stock/.test(m)){const a=db.products.filter(p=>!p.stock);answer=a.length?`${a.length} products are out of stock: ${a.map(p=>p.name).join(', ')}.`:'There are no out-of-stock products.';}
        else if(/low|restock|running out|reorder|need to buy/.test(m)){const a=db.products.filter(p=>p.stock<=p.minStock);answer=a.length?`I found ${a.length} product${a.length===1?'':'s'} at or below their reorder point: ${a.slice(0,10).map(p=>`${p.name} (${p.stock} on hand, reorder at ${p.minStock})`).join('; ')}.`:'No products are currently below their reorder point.';}
        else if(/inventory value|stock value|worth|valuation/.test(m)){answer=`Current inventory cost value is ${money(db.products.reduce((a,p)=>a+p.stock*p.cost,0))}.`;}
        else if(/how many|total products|product count|units on hand|available units/.test(m)){answer=`There are ${db.products.length} products and ${db.products.reduce((a,p)=>a+p.stock,0).toLocaleString()} units on hand.`;}
        else if(/highest|most stock|largest stock|top stock/.test(m)){const a=[...db.products].sort((x,y)=>y.stock-x.stock).slice(0,5);answer=`Highest stock levels: ${a.map(p=>`${p.name} (${p.stock})`).join(', ')}.`;}
        else if(/lowest stock|least stock|smallest stock/.test(m)){const a=[...db.products].filter(p=>p.stock>0).sort((x,y)=>x.stock-y.stock).slice(0,5);answer=`Lowest available stock: ${a.map(p=>`${p.name} (${p.stock})`).join(', ')}.`;}
        else if(/category|electronics|office|furniture|accessories|kitchen|safety|packaging|tools/.test(m)){const cat=categories.find(c=>m.includes(c.toLowerCase()));if(cat){const a=db.products.filter(p=>p.category===cat);answer=`${cat} has ${a.length} products and ${a.reduce((n,p)=>n+p.stock,0).toLocaleString()} units on hand.`;}else{answer=categories.map(c=>`${c}: ${db.products.filter(p=>p.category===c).length}`).join(' · ')+'.';}}
        else if(/pending|purchase order|purchase orders|incoming order/.test(m)){const a=db.purchases.filter(p=>/pending|ordered|partially/i.test(p.status));answer=a.length?`${a.length} purchase orders need attention: ${a.map(p=>`${p.id} from ${p.supplier} (${p.status}, ${money(p.amount)})`).join('; ')}.`:'There are no pending purchase orders.';}
        else if(/supplier|vendor/.test(m)){const s=db.suppliers.find(x=>m.includes(x.name.toLowerCase()));answer=s?`${s.name}: contact ${s.contact}, ${s.email}, ${s.phone}. Status: ${s.status}.`:`There are ${db.suppliers.length} active suppliers. They include ${db.suppliers.slice(0,5).map(x=>x.name).join(', ')}.`;}
        else if(/sales|revenue|sold|orders today|today's/.test(m)){const today=new Date().toDateString(),a=db.sales.filter(s=>(s.status||'Completed')==='Completed'&&new Date(s.date).toDateString()===today),total=a.reduce((n,s)=>n+s.amount,0);answer=`Today’s sales: ${money(total)} across ${a.length} completed order${a.length===1?'':'s'}.`;}
        else if(/sku|stock of|quantity|details of|tell me about|product/.test(m)){const sku=(message.match(/[A-Z]{3}-?\d{3,}/i)||[])[0],p=(sku&&db.products.find(x=>x.sku.toLowerCase()===sku.toLowerCase()))||db.products.find(x=>m.includes(x.name.toLowerCase()));answer=p?`${p.name} (${p.sku}) — ${p.stock} ${p.unit} in stock, reorder at ${p.minStock}. Category: ${p.category}; supplier: ${p.supplier}; selling price: ${money(p.price)}.`:'I could not match that product. Try a SKU such as STK-1001 or the full product name.';}
        else{answer='I can check stock, products, categories, sales, suppliers, purchase orders, inventory value, and restock needs. Ask “help” to see examples.';}
        return send(res,200,{answer});
      }
      return send(res,404,{error:'API route not found'});
    }
    const rel=decodeURIComponent(url.pathname==='/ '||url.pathname==='/'?'/index.html':url.pathname),file=path.resolve(root,'.'+rel);if(!file.startsWith(root+path.sep))return send(res,403,{error:'Forbidden'});try{const data=await readFile(file);const ext=path.extname(file);const headers={'content-type':mime[ext]||'application/octet-stream'};if(['.html','.js','.css'].includes(ext))headers['cache-control']='no-store';res.writeHead(200,headers);res.end(data);}catch{res.writeHead(404,{'content-type':'text/plain'});res.end('Not found');}
  }catch(e){send(res,e.status||500,{error:e.status?e.message:'Server error',detail:e.status?undefined:e.message});}
});
init().then(()=>server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log(`Alphapilot Enterprise server: http://localhost:${Number(process.env.PORT)||3000}`)));
