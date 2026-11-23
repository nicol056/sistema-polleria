
import { useEffect, useState } from "react";
import {
  ref,
  push,
  set,
  onValue,
  update,
} from "firebase/database";
import { database } from "./firebase";
import "./App.css";

const productos = [
  { id: "entero", nombre: "Pollo entero", precio: 70 },
  { id: "cuarto", nombre: "1/4 de pollo", precio: 20 },
  { id: "octavo", nombre: "1/8 de pollo", precio: 12 },
  { id: "mostrito", nombre: "Mostrito", precio: 18 },
  { id: "gaseosa", nombre: "Gaseosa", precio: 5 },
  { id: "gordita", nombre: "Gordita", precio: 3 },
  { id: "ensalada", nombre: "Ensalada", precio: 4 },
];

function App() {
  const [rol, setRol] = useState(null);
  const [cantidades, setCantidades] = useState({});
  const [tipoPedido, setTipoPedido] = useState("mesa");
  const [mesa, setMesa] = useState("1");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [pago, setPago] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [pedidos, setPedidos] = useState([]);
  const [errorPedidos, setErrorPedidos] = useState("");

  // Escuchar pedidos en tiempo real
  useEffect(() => {
    const pedidosRef = ref(database, "pedidos");

    const unsubscribe = onValue(
      pedidosRef,
      (snapshot) => {
        const datos = snapshot.val();

        if (!datos) {
          setPedidos([]);
          return;
        }

        const lista = Object.entries(datos).map(([id, pedido]) => ({
          id,
          ...pedido,
        }));

        lista.sort((a, b) => a.fecha - b.fecha);
        setPedidos(lista);
        setErrorPedidos("");
      },
      (error) => {
        console.error(error);
        setErrorPedidos("No se pudieron cargar los pedidos.");
      }
    );

    return () => unsubscribe();
  }, []);

  const total = productos.reduce(
    (suma, producto) =>
      suma + producto.precio * (Number(cantidades[producto.id]) || 0),
    0
  );

  const vuelto =
    metodoPago === "efectivo"
      ? Math.max(0, Number(pago || 0) - total)
      : 0;

  const cambiarCantidad = (id, valor) => {
    setCantidades((anterior) => ({
      ...anterior,
      [id]: Math.max(0, Math.floor(Number(valor) || 0)),
    }));
  };

  const registrarPedido = async () => {
    const items = productos
      .filter((producto) => Number(cantidades[producto.id]) > 0)
      .map((producto) => ({
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: Number(cantidades[producto.id]),
        subtotal:
          producto.precio * Number(cantidades[producto.id]),
      }));

    if (items.length === 0) {
      setMensaje("Selecciona al menos un producto.");
      return;
    }

    if (metodoPago === "efectivo" && Number(pago) < total) {
      setMensaje("El dinero recibido no cubre el total.");
      return;
    }

    setGuardando(true);
    setMensaje("");

    try {
      const nuevoPedido = push(ref(database, "pedidos"));

      await set(nuevoPedido, {
        tipo: tipoPedido,
        mesa: tipoPedido === "mesa" ? mesa : null,
        items,
        total,
        metodoPago,
        pagoRecibido:
          metodoPago === "efectivo" ? Number(pago) : total,
        vuelto,
        estado: "pendiente",
        fecha: Date.now(),
      });

      setCantidades({});
      setPago("");
      setMensaje("¡Pedido enviado correctamente a cocina!");
    } catch (error) {
      console.error(error);
      setMensaje("No se pudo guardar el pedido. Revisa Firebase.");
    } finally {
      setGuardando(false);
    }
  };

  // Cambiar estado del pedido
  const cambiarEstado = async (pedido, nuevoEstado) => {
    try {
      await update(ref(database, `pedidos/${pedido.id}`), {
        estado: nuevoEstado,
      });
    } catch (error) {
      console.error(error);
      alert("No se pudo actualizar el pedido.");
    }
  };

  // Pedidos que cocina todavía debe mostrar
  const pedidosCocina = pedidos.filter(
    (pedido) => pedido.estado !== "finalizado"
  );

  // Pedidos listos que el mesero debe recoger
  const pedidosListos = pedidos.filter(
    (pedido) => pedido.estado === "entregado"
  );

  const pendientes = pedidosCocina.filter(
    (pedido) => pedido.estado === "pendiente"
  );

  const preparacion = pedidosCocina.filter(
    (pedido) => pedido.estado === "preparacion"
  );

  const listos = pedidosCocina.filter(
    (pedido) => pedido.estado === "entregado"
  );

  const formatoHora = (fecha) =>
    new Date(fecha).toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const tarjetaPedido = (pedido, modo) => (
    <article
      className={`pedido-cocina estado-${pedido.estado}`}
      key={pedido.id}
    >
      <div className="pedido-cabecera">
        <div>
          <h3>Pedido #{pedido.id.slice(-5).toUpperCase()}</h3>
          <span>
            {pedido.tipo === "mesa"
              ? `Mesa ${pedido.mesa}`
              : "Para llevar"}
          </span>
        </div>

        <span className={`estado-pedido estado-${pedido.estado}`}>
          {pedido.estado === "pendiente"
            ? "Pendiente"
            : pedido.estado === "preparacion"
              ? "En preparación"
              : pedido.estado === "entregado"
                ? "Listo para recoger"
                : "Finalizado"}
        </span>
      </div>

      <p className="hora-pedido">
        Registrado a las {formatoHora(pedido.fecha)}
      </p>

      
<div className="lista-productos-pedido">
  {pedido.items?.map((item, index) => (
    <div key={index}>
      <span>
        {item.cantidad} × {item.nombre}
      </span>
    </div>
  ))}
</div>


      {modo === "cocina" && (
        <div className="acciones-pedido">
          {pedido.estado === "pendiente" && (
            <button
              className="btn-preparar"
              onClick={() => cambiarEstado(pedido, "preparacion")}
            >
              Comenzar preparación
            </button>
          )}

          {pedido.estado === "preparacion" && (
            <button
              className="btn-entregado"
              onClick={() => cambiarEstado(pedido, "entregado")}
            >
              Marcar como listo
            </button>
          )}
        </div>
      )}

      {modo === "mesero" && pedido.estado === "entregado" && (
        <div className="acciones-pedido">
          <button
            className="btn-entregado"
            onClick={() => cambiarEstado(pedido, "finalizado")}
          >
            Confirmar entrega al cliente
          </button>
        </div>
      )}
    </article>
  );

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">🍗</span>
          <div>
            <h2>SISTEMA DE POLLERÍA</h2>
            <p>Gestión de pedidos</p>
          </div>
        </div>
        <span className="estado">● Sistema activo</span>
      </header>

      <main className="main">
        {!rol ? (
          <section className="bienvenida">
            <span className="etiqueta">BIENVENIDO</span>
            <h1>¿Cómo deseas ingresar?</h1>
            <p className="descripcion">
              Selecciona tu área de trabajo para continuar.
            </p>

            <div className="roles">
              <button
                className="rol-card"
                onClick={() => setRol("mesero")}
              >
                <span className="rol-icon">🧑‍💼</span>
                <h2>Mesero</h2>
                <p>Registrar pedidos, cobrar y entregar órdenes.</p>
                <span className="rol-link">Ingresar →</span>
              </button>

              <button
                className="rol-card"
                onClick={() => setRol("cocina")}
              >
                <span className="rol-icon">👨‍🍳</span>
                <h2>Cocina</h2>
                <p>Visualizar pedidos y controlar su preparación.</p>
                <span className="rol-link">Ingresar →</span>
              </button>
            </div>
          </section>
        ) : (
          <section className="panel">
            <button className="volver" onClick={() => setRol(null)}>
              ← Volver al inicio
            </button>

            {errorPedidos && (
              <p className="mensaje">{errorPedidos}</p>
            )}

            {rol === "mesero" ? (
              <div className="pedido-panel">
                <span className="etiqueta">ÁREA DE TRABAJO</span>
                <h1>Panel del Mesero</h1>
                <p>Registra pedidos y recoge los que estén listos.</p>

                <div className="aviso-listos">
                  <strong>Pedidos listos para recoger: {pedidosListos.length}</strong>
                  <span>Los pedidos azules ya pueden entregarse al cliente.</span>
                </div>

                {pedidosListos.length > 0 && (
                  <div className="pedidos-mesero">
                    <h2>Pedidos listos para recoger</h2>
                    {pedidosListos.map((pedido) =>
                      tarjetaPedido(pedido, "mesero")
                    )}
                  </div>
                )}

                <div className="pedido-seccion">
                  <h3>1. Tipo de pedido</h3>

                  <div className="opciones">
                    <button
                      className={tipoPedido === "mesa" ? "opcion activa" : "opcion"}
                      onClick={() => setTipoPedido("mesa")}
                    >
                      🍽️ En mesa
                    </button>
                    <button
                      className={tipoPedido === "llevar" ? "opcion activa" : "opcion"}
                      onClick={() => setTipoPedido("llevar")}
                    >
                      🛍️ Para llevar
                    </button>
                  </div>

                  {tipoPedido === "mesa" && (
                    <div className="campo">
                      <label>Número de mesa</label>
                      <select
                        value={mesa}
                        onChange={(e) => setMesa(e.target.value)}
                      >
                        {Array.from({ length: 15 }, (_, i) => (
                          <option key={i + 1} value={String(i + 1)}>
                            Mesa {i + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="pedido-seccion">
                  <h3>2. Seleccionar productos</h3>

                  {productos.map((producto) => (
                    <div className="producto" key={producto.id}>
                      <div>
                        <strong>{producto.nombre}</strong>
                        <span>S/ {producto.precio.toFixed(2)}</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={cantidades[producto.id] || ""}
                        placeholder="0"
                        onChange={(e) =>
                          cambiarCantidad(producto.id, e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>

                <div className="pedido-seccion">
                  <h3>3. Método de pago</h3>

                  <div className="opciones">
                    <button
                      className={metodoPago === "efectivo" ? "opcion activa" : "opcion"}
                      onClick={() => setMetodoPago("efectivo")}
                    >
                      💵 Efectivo
                    </button>
                    <button
                      className={metodoPago === "yape" ? "opcion activa" : "opcion"}
                      onClick={() => setMetodoPago("yape")}
                    >
                      📱 Yape
                    </button>
                  </div>

                  {metodoPago === "efectivo" && (
                    <div className="campo">
                      <label>Dinero recibido (S/)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={pago}
                        onChange={(e) => setPago(e.target.value)}
                        placeholder="Ejemplo: 100"
                      />
                    </div>
                  )}
                </div>

                <div className="resumen">
                  <div>
                    <span>Total a pagar</span>
                    <strong>S/ {total.toFixed(2)}</strong>
                  </div>
                  {metodoPago === "efectivo" && (
                    <div>
                      <span>Vuelto</span>
                      <strong>S/ {vuelto.toFixed(2)}</strong>
                    </div>
                  )}
                </div>

                {mensaje && <p className="mensaje">{mensaje}</p>}

                <button
                  className="registrar"
                  onClick={registrarPedido}
                  disabled={guardando}
                >
                  {guardando ? "Guardando..." : "Enviar pedido a cocina"}
                </button>
              </div>
            ) : (
              <div className="pedido-panel">
                <span className="etiqueta">ÁREA DE TRABAJO</span>
                <h1>Panel de Cocina</h1>
                <p>Gestiona los pedidos recibidos en tiempo real.</p>



                {pedidosCocina.length === 0 ? (
                  <div className="sin-pedidos">
                    <span>🍗</span>
                    <h3>No hay pedidos por preparar</h3>
                    <p>Los nuevos pedidos aparecerán automáticamente aquí.</p>
                  </div>
                ) : (
                  <div className="lista-cocina">
                    {pendientes.length > 0 && (
                      <>
                        <h2>🟡 Pedidos pendientes</h2>
                        {pendientes.map((pedido) =>
                          tarjetaPedido(pedido, "cocina")
                        )}
                      </>
                    )}

                    {preparacion.length > 0 && (
                      <>
                        <h2>🟢 En preparación</h2>
                        {preparacion.map((pedido) =>
                          tarjetaPedido(pedido, "cocina")
                        )}
                      </>
                    )}

                    {listos.length > 0 && (
                      <>
                        <h2>🔵 Pedidos listos para recoger</h2>
                        {listos.map((pedido) =>
                          tarjetaPedido(pedido, "cocina")
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </main>

      <footer>
        Sistema de Pollería © 2026
        <span>Gestión de pedidos en tiempo real</span>
      </footer>
    </div>
  );
}

export default App;
