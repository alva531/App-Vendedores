import { useEffect, useState } from 'react'
import { jsPDF } from 'jspdf'
import logoUrl from './assets/DimacoLogo.png'

const VERSION = 'v0.84'

let logoCache = null

const getLogoDataUrl = async () => {
  if (logoCache) return logoCache
  const res = await fetch(logoUrl)
  const blob = await res.blob()
  logoCache = await new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result)
    fr.onerror = reject
    fr.readAsDataURL(blob)
  })
  return logoCache
}

const num = (v) => {
  const n = parseFloat(String(v).replace(',', '.'))
  return isFinite(n) ? n : 0
}

const fmt = (n) =>
  n.toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

const emptyProduct = () => ({ nombre: '', cantidad: '' })

const loadDraft = () => {
  try {
    return JSON.parse(localStorage.getItem('pedido'))
  } catch {
    return null
  }
}

const archivoPDF = (cliente, entrega) => {
  const slug = (cliente || 'cliente')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  const tipo = entrega === 'despacho' ? 'DESPACHO' : 'LOGISTICA'
  return `pedido_${slug || 'cliente'}_${tipo}.pdf`
}

function crearPDF(data) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 16
  const Wt = W - 2 * M

  if (data.logo) {
    doc.addImage(data.logo, 'PNG', M, 8, 12, 12)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('PEDIDO', W / 2, 20, { align: 'center' })
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text('DIMACO', W / 2, 26, { align: 'center' })
  doc.setTextColor(20)

  doc.setDrawColor(220)
  doc.setLineWidth(0.4)
  doc.line(M, 31, W - M, 31)

  const fecha = new Date().toLocaleDateString('es')
  const filas = [
    ['Fecha:', fecha],
    ['Cliente:', data.cliente || '-'],
    ['Condición:', data.condicion],
  ]
  if (data.entrega === 'despacho') {
    filas.push(['Despacho:', data.modalidad === 'envio' ? 'Con Envío' : 'Retira Cliente'])
  } else {
    filas.push(['Logística:', data.transporte ? 'Incluye transporte' : 'No incluye transporte'])
    if (data.transporte && data.chofer) filas.push(['Chofer:', data.chofer])
  }
  const xVal = M + 26
  let yInfo = 40
  for (const [label, valor] of filas) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(label, M, yInfo)
    doc.setFont('helvetica', 'normal')
    const lineasVal = doc.splitTextToSize(String(valor), W - M - xVal)
    doc.text(lineasVal, xVal, yInfo)
    yInfo += lineasVal.length * 5.6 + 0.8
  }

  const cols = {
    producto: { x: M, w: Wt - 30 },
    cantidad: { x: M + Wt - 30, w: 30 },
  }
  let y = yInfo + 6
  const rowBase = 6.8

  doc.setFillColor(0, 38, 95)
  doc.rect(M, y - 5.6, Wt, rowBase, 'F')
  doc.setTextColor(255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('PRODUCTO', cols.producto.x + 2, y)
  doc.text('CANT.', M + Wt, y, { align: 'right' })
  y += rowBase + 2

  doc.setTextColor(20)
  for (const p of data.productos) {
    const cant = num(p.cantidad)
    if (!p.nombre.trim() && cant === 0) continue
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    const lines = doc.splitTextToSize(p.nombre.trim() || '-', cols.producto.w - 4)
    const h = rowBase + (lines.length - 1) * 4.4
    doc.text(lines, cols.producto.x + 2, y)
    doc.text(p.cantidad === '' ? '0' : p.cantidad, M + Wt, y, { align: 'right' })

    doc.setDrawColor(235)
    doc.setLineWidth(0.2)
    doc.line(M, y + 2, W - M, y + 2)
    y += h + 0.6
  }

  const extras = []
  if (data.porc1 > 0) extras.push(`Descuento 1: ${fmt(data.porc1)}%`)
  if (data.porc2 > 0) extras.push(`Descuento 2: ${fmt(data.porc2)}%`)
  for (const t of extras) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.text(t, M + 2, y)
    y += 7
  }

  const obs = (data.observaciones || '').trim()
  if (obs) {
    y += 2
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage()
      y = 20
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Observaciones:', M, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    const lineasObs = obs.split(/\r?\n/).flatMap((l) => doc.splitTextToSize(l, W - 2 * M))
    doc.text(lineasObs, M, y)
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(120)
  const H = doc.internal.pageSize.getHeight()
  doc.text('Documento generado con Vendedores', W / 2, H - 12, { align: 'center' })

  return doc
}

export default function App() {
  const d = loadDraft()
  const [cliente, setCliente] = useState(d?.cliente ?? '')
  const [condicion, setCondicion] = useState(d?.condicion ?? 'A')
  const [entrega, setEntrega] = useState(d?.entrega ?? 'logistica')
  const [modalidad, setModalidad] = useState(d?.modalidad ?? 'retira')
  const [desc1, setDesc1] = useState(d?.desc1 ?? '')
  const [desc2, setDesc2] = useState(d?.desc2 ?? '')
  const [transporte, setTransporte] = useState(d?.transporte ?? false)
  const [chofer, setChofer] = useState(d?.chofer ?? '')
  const [productos, setProductos] = useState(
    d?.productos?.length ? d.productos : [emptyProduct()],
  )
  const [observaciones, setObservaciones] = useState(d?.observaciones ?? '')
  const [busy, setBusy] = useState(false)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    localStorage.setItem(
      'pedido',
      JSON.stringify({ cliente, condicion, entrega, modalidad, desc1, desc2, transporte, chofer, productos, observaciones }),
    )
  }, [cliente, condicion, entrega, modalidad, desc1, desc2, transporte, chofer, productos, observaciones])

  const porc1 = num(desc1)
  const porc2 = num(desc2)

  const setProd = (i, campo, valor) =>
    setProductos((ps) => ps.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)))

  const addProd = () => setProductos((ps) => [...ps, emptyProduct()])
  const delProd = (i) =>
    setProductos((ps) => (ps.length > 1 ? ps.filter((_, j) => j !== i) : ps))

  const compartir = async () => {
    const validos = productos.filter(
      (p) => p.nombre.trim() && num(p.cantidad) > 0,
    )
    if (!cliente.trim() || validos.length === 0) {
      setAviso('Completá el cliente y al menos un producto con cantidad.')
      return
    }
    setAviso('')
    setBusy(true)
    try {
      const logo = await getLogoDataUrl()
      const data = {
        cliente,
        condicion,
        entrega,
        modalidad,
        productos: validos,
        porc1,
        porc2,
        transporte,
        chofer,
        observaciones,
        logo,
      }
      const doc = crearPDF(data)
      const nombre = archivoPDF(cliente, entrega)
      const blob = doc.output('blob')
      const archivo = new File([blob], nombre, { type: 'application/pdf' })
      const texto = `Pedido para ${cliente} - Condición: ${condicion}`
      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo] })
      } else {
        doc.save(nombre)
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
        setAviso(`${VERSION}: tu navegador no soporta adjuntar directo, así que el PDF se DESCARGÓ. Abrilo desde Descargas y adjuntalo en WhatsApp.`)
      }
    } catch (e) {
      if (e?.name !== 'AbortError') setAviso('No se pudo compartir: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  const limpiar = () => {
    setCliente('')
    setCondicion('A')
    setEntrega('logistica')
    setModalidad('retira')
    setDesc1('')
    setDesc2('')
    setTransporte(false)
    setChofer('')
    setProductos([emptyProduct()])
    setObservaciones('')
    localStorage.removeItem('pedido')
    setAviso('')
  }

  return (
    <main className="app">
      <header className="topbar">
        <h1>Vendedores</h1>
        <button type="button" className="btn-ghost" onClick={limpiar}>
          Limpiar
        </button>
      </header>

      <section className="card">
        <label className="field">
          <span>Cliente</span>
          <input
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Nombre del cliente"
            autoComplete="off"
          />
        </label>

        <div className="field">
          <span>Condición</span>
          <div className="segmented">
            {['A', 'M'].map((c) => (
              <button
                key={c}
                type="button"
                className={condicion === c ? 'seg active' : 'seg'}
                onClick={() => setCondicion(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>Entrega</span>
          <div className="segmented">
            {[
              ['despacho', 'Despacho'],
              ['logistica', 'Logística'],
            ].map(([v, label]) => (
              <button
                key={v}
                type="button"
                className={entrega === v ? 'seg active' : 'seg'}
                onClick={() => setEntrega(v)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {entrega === 'despacho' && (
          <div className="field">
            <span>Modalidad</span>
            <div className="segmented">
              {[
                ['retira', 'Retira Cliente'],
                ['envio', 'Con Envío'],
              ].map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  className={modalidad === v ? 'seg active' : 'seg'}
                  onClick={() => setModalidad(v)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {entrega === 'logistica' && (
          <>
            <label className="check">
              <input
                type="checkbox"
                checked={transporte}
                onChange={(e) => setTransporte(e.target.checked)}
              />
              <span>Incluye transporte</span>
            </label>

            {transporte && (
              <div className="transporte">
                <label>
                  <span>Chofer (opcional)</span>
                  <input
                    value={chofer}
                    onChange={(e) => setChofer(e.target.value)}
                    placeholder="Nombre y apellido"
                    autoComplete="off"
                  />
                </label>
              </div>
            )}
          </>
        )}

        <ul className="productos">
          {productos.map((p, i) => (
            <li key={i} className="prod">
              <div className="prod-row">
                <input
                  className="prod-nombre"
                  value={p.nombre}
                  onChange={(e) => setProd(i, 'nombre', e.target.value)}
                  placeholder={`Producto ${i + 1}`}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="prod-del"
                  onClick={() => delProd(i)}
                  aria-label="Quitar producto"
                  disabled={productos.length === 1}
                >
                  ×
                </button>
              </div>
              <div className="prod-fila-dato">
                <label>
                  <span>Cantidad</span>
                  <input
                    type="text"
                    value={p.cantidad}
                    onChange={(e) => setProd(i, 'cantidad', e.target.value)}
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>

        <button type="button" className="btn-add" onClick={addProd}>
          + Agregar producto
        </button>

        <div className="descuentos">
          <label>
            <span>Descuento 1 (%)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              value={desc1}
              onChange={(e) => setDesc1(e.target.value)}
              placeholder="0"
            />
          </label>
          <label>
            <span>Descuento 2 (%)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              value={desc2}
              onChange={(e) => setDesc2(e.target.value)}
              placeholder="0"
            />
          </label>
        </div>

        <label className="obs-field">
          <span>Observaciones</span>
          <textarea
            rows="3"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Notas adicionales (opcional)"
          />
        </label>
      </section>

      {aviso && <p className="aviso">{aviso}</p>}

      <button type="button" className="btn-cta" onClick={compartir} disabled={busy}>
        {busy ? 'Preparando...' : 'Compartir por WhatsApp'}
      </button>

      <footer className="versiono">{VERSION}</footer>
    </main>
  )
}
