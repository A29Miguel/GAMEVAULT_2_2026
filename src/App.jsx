import { useMemo, useState, useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, PresentationControls, RoundedBox } from '@react-three/drei'
import {
  Gamepad2, LayoutDashboard, Package, ShoppingCart, ReceiptText, Users,
  Search, Bell, Plus, TrendingUp, Boxes, Wallet,
  ArrowUpRight, ArrowDownRight, Pencil, Trash2, X, Minus, Check,
  Menu, LogOut, CircleAlert, ChevronDown, CalendarDays, Filter,
  Monitor, Headphones, Disc3, Gamepad, ShoppingBag, Lock, Unlock, Printer
} from 'lucide-react'
import { apiGetProducts, apiCreateProduct, apiUpdateProduct, apiDeleteProduct, apiUpdateStock, apiGetSales, apiCreateSale } from './lib/api'

const money = (n) => `Bs ${Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const nav = [
  { id: 'dashboard', label: 'Panel principal', icon: LayoutDashboard, roles: ['Administrador', 'Empleado'] },
  { id: 'products', label: 'Productos', icon: Package, roles: ['Administrador'] },
  { id: 'inventory', label: 'Inventario', icon: Boxes, roles: ['Administrador'] },
  { id: 'sales', label: 'Nueva venta', icon: ShoppingCart, roles: ['Administrador', 'Empleado'] },
  { id: 'history', label: 'Historial de ventas', icon: ReceiptText, roles: ['Administrador', 'Empleado'] },
  { id: 'users', label: 'Usuarios', icon: Users, roles: ['Administrador'] },
]
const categoryIcon = { Consola: Monitor, Accesorio: Headphones, Videojuego: Disc3 }

// --- COMPONENTE 3D (MANDO DE CONSOLA) ---
function GamepadModel() {
  const group = useRef()
  
  // Rotación automática suave
  useFrame((state, delta) => {
    group.current.rotation.y += delta * 0.4
  })

  return (
    <group ref={group} scale={1.2}>
      {/* Cuerpo central */}
      <RoundedBox args={[3.5, 1.5, 0.8]} radius={0.2} smoothness={4}>
        <meshStandardMaterial color="#3b82f6" roughness={0.2} metalness={0.5} />
      </RoundedBox>
      
      {/* Mango izquierdo */}
      <mesh position={[-1.3, -0.9, 0]} rotation={[0, 0, Math.PI / 6]}>
        <cylinderGeometry args={[0.4, 0.5, 1.8]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.3} />
      </mesh>

      {/* Mango derecho */}
      <mesh position={[1.3, -0.9, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <cylinderGeometry args={[0.4, 0.5, 1.8]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.3} />
      </mesh>

      {/* Joystick Izquierdo */}
      <mesh position={[-0.8, 0.2, 0.45]}>
        <cylinderGeometry args={[0.3, 0.3, 0.2, 32]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[-0.8, 0.35, 0.45]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color="#60a5fa" />
      </mesh>

      {/* Botones (Simulando una cruz) */}
      <mesh position={[0.8, 0.4, 0.45]}>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 32]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
      <mesh position={[0.8, -0.1, 0.45]}>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 32]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    </group>
  )
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [cart, setCart] = useState([])
  const [notice, setNotice] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  const [role, setRole] = useState('Empleado') 
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminPass, setAdminPass] = useState('')
  const [receiptModal, setReceiptModal] = useState(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [dbProducts, dbSales] = await Promise.all([apiGetProducts(), apiGetSales()])
        setProducts(dbProducts)
        setSales(dbSales)
      } catch (error) {
        flash('Error de conexión')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const totalStock = products.reduce((a, p) => a + Number(p.stock), 0)
  const revenue = sales.reduce((a, s) => a + Number(s.total), 0)
  const lowStock = products.filter(p => p.stock <= 3).length
  const filtered = useMemo(() => products.filter(p => `${p.nombre} ${p.categoria} ${p.sku}`.toLowerCase().includes(query.toLowerCase())), [products, query])

  function flash(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2800)
  }
  
  async function submitProduct(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const item = {
      nombre: data.get('name').trim(), categoria: data.get('category'), precio: Number(data.get('price')),
      stock: Number(data.get('stock')), sku: data.get('sku').trim() || `GV-${Date.now().toString().slice(-5)}`
    }
    try {
      if (editing) { await apiUpdateProduct(editing.id, item); flash('Actualizado') } 
      else { await apiCreateProduct(item); flash('Registrado') }
      setProducts(await apiGetProducts()); setModal(null)
    } catch { flash('Error al guardar') }
  }

  async function removeProduct(id) {
    if (!window.confirm('¿Eliminar producto?')) return
    await apiDeleteProduct(id); setProducts(products.filter(p => p.id !== id))
  }

  function addToCart(product) {
    if (product.stock < 1) return flash('Sin stock')
    setCart(old => {
      const found = old.find(x => x.id === product.id)
      if (found) return old.map(x => x.id === product.id ? { ...x, quantity: Math.min(x.quantity + 1, product.stock) } : x)
      return [...old, { ...product, quantity: 1 }]
    })
  }
  function changeQuantity(id, delta) {
    setCart(old => old.map(x => x.id === id ? { ...x, quantity: Math.max(1, Math.min(x.quantity + delta, products.find(p => p.id === id)?.stock ?? 1)) } : x))
  }
  function finishSale() {
    if (!cart.length) return flash('Carrito vacío')
    const total = cart.reduce((a, p) => a + p.precio * p.quantity, 0)
    setReceiptModal({ items: cart, total })
  }

  async function processSale(clientData = null) {
    if (!receiptModal) return;
    const salePayload = { 
      codigo: `GV-${Date.now().toString().slice(-6)}`, total: receiptModal.total, vendedor: role,
      cliente_nombre: clientData ? clientData.name : 'Consumidor Final', cliente_ci: clientData ? clientData.ci : 'N/A', items: receiptModal.items 
    }
    await apiCreateSale(salePayload)
    for (const item of receiptModal.items) {
      const prod = products.find(p => p.id === item.id)
      if (prod) await apiUpdateStock(prod.id, prod.stock - item.quantity)
    }
    setProducts(await apiGetProducts()); setSales(await apiGetSales())
    setCart([]); setReceiptModal(null); flash('Venta registrada'); setPage('history')
  }

  const handleAdminLogin = (e) => {
    e.preventDefault()
    if (adminPass === '123456') {
      setRole('Administrador'); setShowAdminModal(false); setAdminPass(''); flash('Modo Admin activado')
    } else { flash('Contraseña incorrecta') }
  }
  const handleLogout = () => { setRole('Empleado'); setPage('dashboard'); flash('Sesión finalizada') }

  const allowedNav = nav.filter(item => item.roles.includes(role))

  if (isLoading) {
    return <div className="app-shell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#3b82f6' }}><h2>Cargando sistema...</h2></div>
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><Gamepad2 size={23}/></div><div><b>GAMEVAULT</b><span>STORE MANAGEMENT</span></div></div>
        <div className="store-chip"><span className="live-dot"/> Sistema Conectado <ChevronDown size={14}/></div>
        <div className="nav-caption">MENÚ PRINCIPAL</div>
        <nav>
          {allowedNav.map(item => (
            <button key={item.id} className={`nav-link ${page === item.id ? 'active' : ''}`} onClick={() => { setPage(item.id); setMobileNav(false) }}>
              <item.icon size={18}/><span>{item.label}</span>{item.id === 'sales' && cart.length > 0 && <em>{cart.length}</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div style={{ padding: '0 10px 15px' }}>
            {role === 'Empleado' ? (
              <button className="primary-button full-button" style={{ background: '#1e3a8a', color: '#93c5fd', borderColor: '#3b82f6' }} onClick={() => setShowAdminModal(true)}>
                <Lock size={15}/> Modo Administrador
              </button>
            ) : (
              <button className="primary-button full-button" style={{ background: '#3b82f6', color: '#ffffff', borderColor: '#60a5fa' }} onClick={handleLogout}>
                <Unlock size={15}/> Salir de Admin
              </button>
            )}
          </div>
          <div className="profile">
            <div className="avatar">GV</div>
            <div className="profile-info"><b>Usuario Demo</b><span>{role}</span></div>
            <button className="icon-button" onClick={handleLogout}><LogOut size={17}/></button>
          </div>
        </div>
      </aside>
      
      {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} />}
      
      <main className="main-area">
        <header className="topbar">
          <div className="top-left">
            <button className="mobile-menu icon-button" onClick={() => setMobileNav(true)}><Menu/></button>
            <div className="breadcrumb">GameVault <span>/</span> <b>{nav.find(n => n.id === page)?.label}</b></div>
          </div>
          <div className="top-actions">
            <div className="status-pill"><span className="live-dot"/> Modo {role}</div>
            <button className="icon-button notification" onClick={() => flash(`${lowStock} productos con stock bajo`)}><Bell size={18}/>{lowStock > 0 && <i/>}</button>
            <div className="top-avatar">GV</div>
          </div>
        </header>
        <div className="content">
          {page === 'dashboard' && <Dashboard products={products} sales={sales} totalStock={totalStock} revenue={revenue} lowStock={lowStock} setPage={setPage}/>}
          {page === 'products' && <Products products={filtered} query={query} setQuery={setQuery} onAdd={() => { setEditing(null); setModal('product') }} onEdit={(p) => { setEditing(p); setModal('product') }} onDelete={removeProduct}/>}
          {page === 'inventory' && <Inventory products={filtered} query={query} setQuery={setQuery}/>}
          {page === 'sales' && <Sales products={products} cart={cart} addToCart={addToCart} changeQuantity={changeQuantity} finishSale={finishSale} query={query} setQuery={setQuery} setCart={setCart}/>}
          {page === 'history' && <History sales={sales}/>}
          {page === 'users' && <UsersPage role={role} setRole={setRole}/>}
        </div>
        <footer className="footer"><span>© 2026 GameVault · Conectado a Supabase</span><span>Versión 1.0.0</span></footer>
      </main>

      {modal === 'product' && <ProductModal editing={editing} onClose={() => setModal(null)} onSubmit={submitProduct}/>}
      
      {showAdminModal && (
        <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setShowAdminModal(false)}>
          <form className="modal" style={{ maxWidth: '400px' }} onSubmit={handleAdminLogin}>
            <div className="modal-head"><div><span className="eyebrow">SEGURIDAD</span><h2>Acceso Restringido</h2></div><button type="button" className="icon-button" onClick={() => setShowAdminModal(false)}><X/></button></div>
            <div className="form-field full">
              <label>Contraseña de Administrador</label>
              <input type="password" placeholder="Ingresa la contraseña" value={adminPass} onChange={e => setAdminPass(e.target.value)} autoFocus />
              <small>Contraseña: <b>123456</b></small>
            </div>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowAdminModal(false)}>Cancelar</button><button className="primary-button" type="submit"><Unlock size={16}/> Desbloquear</button></div>
          </form>
        </div>
      )}

      {receiptModal && <ReceiptModal data={receiptModal} role={role} onClose={() => setReceiptModal(null)} onProcess={processSale} />}
      {notice && <div className="toast"><Check size={17}/>{notice}</div>}
    </div>
  )
}

// --- VISTAS (Dashboard con el modelo 3D) ---
function Dashboard({ products, sales, totalStock, revenue, lowStock, setPage }) {
  const recent = sales.slice(0, 4)
  return <>
    <PageHeading eyebrow="RESUMEN GENERAL" title="Panel principal" subtitle="Bienvenido a GameVault."/>
    
    <div className="welcome-banner">
      <div>
        <div className="welcome-tag">GAMEVAULT STORE</div>
        <h2>Todo tu inventario,<br/>bajo control.</h2>
        <p>Administra productos y registra ventas.</p>
        <button onClick={() => setPage('sales')}>Registrar venta <ArrowUpRight size={16}/></button>
      </div>
      
      {/* AQUÍ ESTÁ EL MODELO 3D INTERACTIVO */}
      <div className="banner-art" style={{ width: '300px', height: '200px' }}>
        <Canvas camera={{ position: [0, 0, 7], fov: 50 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} />
          <PresentationControls global config={{ mass: 2, tension: 500 }} snap={{ mass: 4, tension: 1500 }}>
            <Float speed={2} rotationIntensity={1} floatIntensity={2}>
              <GamepadModel />
            </Float>
          </PresentationControls>
        </Canvas>
      </div>
    </div>

    <div className="stats-grid">
      <Stat icon={Wallet} label="Ventas" value={sales.length} note="Operaciones" trend="neutral"/>
      <Stat icon={TrendingUp} label="Ingresos" value={money(revenue)} note="Total" trend="up"/>
      <Stat icon={Boxes} label="Stock" value={totalStock} note={`${products.length} productos`} trend="neutral"/>
      <Stat icon={CircleAlert} label="Stock bajo" value={lowStock} note="Requieren atención" trend={lowStock ? 'down' : 'up'}/>
    </div>
    <div className="dashboard-grid">
      <section className="panel">
        <div className="panel-head"><div><h3>Productos recientes</h3></div><button className="text-button" onClick={() => setPage('products')}>Ver todos <ArrowUpRight size={14}/></button></div>
        <div className="mini-product-list">{products.slice(0, 4).map(p => <div className="mini-product" key={p.id}><ProductIcon category={p.categoria}/><div className="mini-product-info"><b>{p.nombre}</b><span>{p.categoria} · {p.sku}</span></div><strong>{money(p.precio)}</strong></div>)}</div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h3>Actividad reciente</h3></div><button className="text-button" onClick={() => setPage('history')}>Historial <ArrowUpRight size={14}/></button></div>
        {recent.length ? <div className="activity-list">{recent.map(s => <div className="activity" key={s.id}><div className="activity-icon"><ShoppingBag size={17}/></div><div><b>Venta {s.codigo}</b><span>{new Date(s.fecha).toLocaleString('es-BO')}</span></div><strong>{money(s.total)}</strong></div>)}</div> : <Empty icon={ReceiptText} title="Sin ventas" text="Las ventas aparecerán aquí."/>}
      </section>
    </div>
  </>
}

// ... (Los demás componentes: Stat, ProductIcon, Products, Inventory, Sales, History, UsersPage, ProductModal, ReceiptModal, Empty, PageHeading se mantienen igual que en el mensaje anterior)
// Para ahorrar espacio no los repito, pero asegúrate de mantenerlos en tu archivo.

function ReceiptModal({ data, role, onClose, onProcess }) {
  const [withReceipt, setWithReceipt] = useState(true)
  const [clientData, setClientData] = useState({ name: '', ci: '' })
  const handlePrint = (e) => {
    e.preventDefault()
    if (withReceipt && (!clientData.name || !clientData.ci)) return alert("Llena los datos o elige 'Sin Recibo'.")
    if (withReceipt) {
      const printWindow = window.open('', '_blank', 'width=600,height=600');
      printWindow.document.write(`<html><head><title>Recibo</title><style>body{font-family:sans-serif;padding:20px} table{width:100%;border-collapse:collapse;margin-top:20px} th,td{border-bottom:1px solid #ddd;padding:8px} .total{font-weight:bold;text-align:right;margin-top:20px}</style></head><body><h2>GAMEVAULT</h2><p><b>Cliente:</b> ${clientData.name}<br/><b>CI:</b> ${clientData.ci}</p><table><thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>${data.items.map(i => `<tr><td>${i.nombre}</td><td>${i.quantity}</td><td>Bs ${i.precio}</td><td>Bs ${(i.precio * i.quantity).toFixed(2)}</td></tr>`).join('')}</tbody></table><div class="total">Total: Bs ${data.total.toFixed(2)}</div></body></html>`);
      printWindow.document.close(); printWindow.focus(); setTimeout(() => { printWindow.print(); }, 500);
    }
    onProcess(withReceipt ? clientData : null)
  }
  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={handlePrint}>
        <div className="modal-head"><div><span className="eyebrow">FINALIZAR VENTA</span><h2>Datos del Recibo</h2></div><button type="button" className="icon-button" onClick={onClose}><X/></button></div>
        <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
          <button type="button" onClick={() => setWithReceipt(true)} className={`primary-button ${!withReceipt ? 'secondary-button' : ''}`} style={{ flex: 1 }}>Con Recibo</button>
          <button type="button" onClick={() => setWithReceipt(false)} className={`primary-button ${withReceipt ? 'secondary-button' : ''}`} style={{ flex: 1 }}>Sin Recibo</button>
        </div>
        {withReceipt && (
          <div className="modal-grid" style={{ marginBottom: '15px' }}>
            <div className="form-field full"><label>Nombre del Cliente</label><input required value={clientData.name} onChange={e => setClientData({...clientData, name: e.target.value})} placeholder="Ej. Juan Pérez" /></div>
            <div className="form-field full"><label>CI</label><input required value={clientData.ci} onChange={e => setClientData({...clientData, ci: e.target.value})} placeholder="Ej. 1234567" /></div>
          </div>
        )}
        <div style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total:</span><strong style={{ color: '#3b82f6', fontSize: '18px' }}>Bs {data.total.toFixed(2)}</strong></div>
        </div>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button"><Printer size={16}/> {withReceipt ? 'Imprimir y Registrar' : 'Registrar Venta'}</button></div>
      </form>
    </div>
  )
}

function PageHeading({ eyebrow, title, subtitle, action, onAction }) { return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action && <button className="primary-button" onClick={onAction}><Plus size={17}/>{action}</button>}</div> }
function Stat({ icon: Icon, label, value, note, trend }) { return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className="stat-icon"><Icon size={18}/></div></div><div className="stat-value">{value}</div><div className={`stat-note ${trend}`}><span>{trend === 'down' ? <ArrowDownRight size={14}/> : <ArrowUpRight size={14}/>}</span>{note}</div></div> }
function ProductIcon({ category }) { const Icon = categoryIcon[category] || Gamepad; return <div className="product-icon"><Icon size={20}/></div> }
function Products({ products, query, setQuery, onAdd, onEdit, onDelete }) { return <><PageHeading eyebrow="CATÁLOGO" title="Productos" subtitle="Administra el catálogo." action="Nuevo producto" onAction={onAdd}/><div className="toolbar"><div className="search-box"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar..."/></div><button className="secondary-button"><Filter size={16}/> Filtros</button></div><div className="panel table-panel"><div className="table-title"><div><h3>Catálogo</h3><p>{products.length} productos</p></div><span className="table-badge">SUPABASE DB</span></div><div className="table-wrap"><table><thead><tr><th>PRODUCTO</th><th>CÓDIGO</th><th>CATEGORÍA</th><th>PRECIO</th><th>STOCK</th><th>ESTADO</th><th></th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td><div className="product-cell"><ProductIcon category={p.categoria}/><b>{p.nombre}</b></div></td><td className="muted-cell">{p.sku}</td><td>{p.categoria}</td><td className="price-cell">{money(p.precio)}</td><td>{p.stock}</td><td><span className={`stock-badge ${p.stock <= 3 ? 'low' : 'available'}`}>{p.stock <= 3 ? 'Stock bajo' : 'Disponible'}</span></td><td><div className="row-actions"><button className="icon-button" onClick={() => onEdit(p)}><Pencil size={15}/></button><button className="icon-button danger-hover" onClick={() => onDelete(p.id)}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table>{products.length === 0 && <Empty icon={Package} title="No hay productos" text="Prueba con otro término."/>}</div></div></> }
function Inventory({ products, query, setQuery }) { return <><PageHeading eyebrow="CONTROL" title="Inventario" subtitle="Cantidades disponibles."/><div className="inventory-summary"><div><span>Registrados</span><b>{products.length}</b></div><div><span>Stock bajo</span><b className="warning-text">{products.filter(p => p.stock <= 3).length}</b></div><div><span>Unidades</span><b>{products.reduce((a,p) => a + p.stock, 0)}</b></div></div><div className="toolbar"><div className="search-box"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar..."/></div></div><div className="inventory-grid">{products.map(p => <div className="inventory-card" key={p.id}><div className="inventory-card-top"><ProductIcon category={p.categoria}/><span className={`stock-badge ${p.stock <= 3 ? 'low' : 'available'}`}>{p.stock <= 3 ? 'Reponer' : 'Disponible'}</span></div><h3>{p.nombre}</h3><span className="muted-cell">{p.sku} · {p.categoria}</span><div className="stock-number"><b>{p.stock}</b><span>unidades</span></div><div className="stock-track"><i style={{width: `${Math.min(100, p.stock * 8)}%`}}/></div></div>)}</div></> }
function Sales({ products, cart, addToCart, changeQuantity, finishSale, query, setQuery, setCart }) {
  const available = products.filter(p => `${p.nombre} ${p.categoria}`.toLowerCase().includes(query.toLowerCase()))
  const total = cart.reduce((a,p) => a + p.precio * p.quantity, 0)
  const cancelSale = () => { if(window.confirm('¿Cancelar venta?')) setCart([]); }
  return <><PageHeading eyebrow="PUNTO DE VENTA" title="Nueva venta" subtitle="Selecciona productos."/><div className="sales-layout"><section><div className="toolbar sales-toolbar"><div className="search-box"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar..."/></div></div><div className="sale-products">{available.map(p => <button className="sale-product" key={p.id} onClick={() => addToCart(p)} disabled={p.stock < 1}><ProductIcon category={p.categoria}/><span className="sale-product-name">{p.nombre}</span><small>{p.stock} disponibles</small><b>{money(p.precio)}</b><span className="add-circle"><Plus size={16}/></span></button>)}</div></section><aside className="cart-panel"><div className="cart-heading"><div><h3>Carrito</h3><p>{cart.length} productos</p></div><ShoppingCart size={20}/></div>{cart.length ? <div className="cart-items">{cart.map(p => <div className="cart-item" key={p.id}><div className="cart-item-main"><b>{p.nombre}</b><span>{money(p.precio)} c/u</span></div><div className="quantity-control"><button onClick={() => changeQuantity(p.id, -1)}><Minus size={13}/></button><b>{p.quantity}</b><button onClick={() => changeQuantity(p.id, 1)}><Plus size={13}/></button></div><strong>{money(p.precio * p.quantity)}</strong></div>)}</div> : <Empty icon={ShoppingCart} title="Carrito vacío" text="Selecciona un producto."/>}<div className="cart-total"><span>Total</span><b>{money(total)}</b></div><div style={{ display: 'flex', gap: '10px' }}><button className="secondary-button" disabled={!cart.length} onClick={cancelSale} style={{ width: '40px', padding: 0 }} title="Cancelar"><Trash2 size={16}/></button><button className="primary-button" disabled={!cart.length} onClick={finishSale} style={{ flex: 1 }}>Registrar venta <ArrowUpRight size={16}/></button></div></aside></div></> 
}
function History({ sales }) { return <><PageHeading eyebrow="TRANSACCIONES" title="Historial" subtitle="Ventas registradas."/><div className="panel table-panel"><div className="table-title"><div><h3>Ventas</h3><p>{sales.length} operaciones</p></div><CalendarDays size={19} className="muted-icon"/></div>{sales.length ? <div className="table-wrap"><table><thead><tr><th>CÓDIGO</th><th>FECHA</th><th>VENDEDOR</th><th>CLIENTE</th><th>TOTAL</th><th>ESTADO</th></tr></thead><tbody>{sales.map(s => <tr key={s.id}><td><b>{s.codigo}</b></td><td>{new Date(s.fecha).toLocaleString('es-BO')}</td><td>{s.vendedor}</td><td>{s.cliente_nombre}</td><td className="price-cell">{money(s.total)}</td><td><span className="stock-badge available">Completada</span></td></tr>)}</tbody></table></div> : <Empty icon={ReceiptText} title="Sin ventas" text="No hay historial."/>}</div></> }
function UsersPage({ role, setRole }) { return <><PageHeading eyebrow="ACCESOS" title="Usuarios" subtitle="Perfiles del sistema."/><div className="panel user-panel"><div className="user-row"><div className="user-avatar">GV</div><div className="user-data"><b>Usuario Demo</b><span>demo@gamevault.local</span></div><span className="stock-badge available">Activo</span></div><div className="form-field"><label>Rol actual</label><select value={role} onChange={e => setRole(e.target.value)}><option>Administrador</option><option>Empleado</option></select></div></div></> }
function ProductModal({ editing, onClose, onSubmit }) { return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><form className="modal" onSubmit={onSubmit}><div className="modal-head"><div><span className="eyebrow">CATÁLOGO</span><h2>{editing ? 'Editar' : 'Nuevo'} producto</h2></div><button type="button" className="icon-button" onClick={onClose}><X/></button></div><div className="modal-grid"><div className="form-field full"><label>Nombre</label><input name="name" required defaultValue={editing?.nombre} placeholder="Ej. Super Mario"/></div><div className="form-field"><label>SKU</label><input name="sku" defaultValue={editing?.sku} placeholder="GV-006"/></div><div className="form-field"><label>Categoría</label><select name="category" defaultValue={editing?.categoria || 'Videojuego'}><option>Videojuego</option><option>Consola</option><option>Accesorio</option></select></div><div className="form-field"><label>Precio (Bs)</label><input name="price" type="number" min="0" step="0.01" required defaultValue={editing?.precio} placeholder="0.00"/></div><div className="form-field"><label>Stock</label><input name="stock" type="number" min="0" step="1" required defaultValue={editing?.stock} placeholder="0"/></div></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit"><Check size={16}/>{editing ? 'Guardar' : 'Registrar'}</button></div></form></div> }
function Empty({ icon: Icon, title, text }) { return <div className="empty-state"><div><Icon size={23}/></div><b>{title}</b><p>{text}</p></div> }

