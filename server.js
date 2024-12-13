const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = 5000;

// Middleware para analizar el cuerpo de las solicitudes JSON
app.use(bodyParser.json());

// Servir archivos estáticos desde el directorio raíz y subdirectorios
app.use(express.static(path.join(__dirname)));

// Archivo donde se almacenarán los usuarios
const USERS_FILE = path.join(__dirname, "usuarios.txt");

function leerUsuarios() {
    if (!fs.existsSync(USERS_FILE)) {
        return [];
    }
    const data = fs.readFileSync(USERS_FILE, "utf8");
    return data
        .split("\n")  // Dividir por líneas
        .filter(line => line.trim() !== "")  // Filtramos las líneas vacías
        .map(line => {
            try {
                return JSON.parse(line);  // Intentamos parsear cada línea como un objeto JSON
            } catch (error) {
                console.error("Error al parsear línea:", line, error);
                return null;  // Si el JSON está mal formado, se ignora
            }
        })
        .filter(user => user !== null);  // Filtrar las líneas que no se pudieron parsear
}


app.post("/login", (req, res) => {
    const { email, password } = req.body;

    // Obtener la lista de usuarios desde el archivo
    const usuarios = leerUsuarios();

    // Buscar el usuario que coincida con el email y la contraseña
    const user = usuarios.find(user => user.email === email && user.password === password);
    if (!user) {
        return res.status(401).json({ error: "Correo o contraseña incorrectos." });
    }

    // Si el usuario existe, devolver un mensaje de éxito
    res.json({ message: "Inicio de sesión exitoso.", user });
});



app.post("/registrar-usuario", (req, res) => {
    const { name, email, phone, password } = req.body;

    // Crear un objeto de usuario
    const userData = JSON.stringify({ name, email, phone, password }) + "\n";  // Convertimos el objeto en un string JSON y agregamos un salto de línea

    const filePath = path.join(__dirname, "usuarios.txt");

    // Guardar los datos en el archivo (añadir al final del archivo existente)
    fs.appendFile(filePath, userData, (err) => {
        if (err) {
            console.error("Error al guardar los datos en usuarios.txt:", err);
            return res.status(500).send("Error al guardar los datos.");
        }
        console.log("Datos de usuario guardados correctamente en usuarios.txt.");
        res.status(200).json({ message: "Usuario registrado correctamente." });
    });
});



// Ruta para manejar el guardado de datos en carrito.txt
app.post("/guardar-datos", (req, res) => {
    const { serviceName, subservice, name, email, details, phone } = req.body;

    // Formatear los datos para el archivo
    const data = `Servicio: ${serviceName}\nSubservicio: ${subservice}\nNombre: ${name}\nCorreo: ${email}\nDetalles: ${details}\nTeléfono: ${phone || "No especificado"}\nPrecio: ${calcularPrecio(subservice)}\n-----------------------------\n`;

    // Ruta del archivo carrito.txt
    const filePath = path.join(__dirname, "carrito.txt");

    // Guardar los datos en el archivo (añadir al final del archivo existente)
    fs.appendFile(filePath, data, (err) => {
        if (err) {
            console.error("Error al guardar los datos en carrito.txt:", err);
            return res.status(500).send("Error al guardar los datos.");
        }
        console.log("Datos guardados correctamente en carrito.txt.");
        res.status(200).send("Datos guardados correctamente.");
    });
});

// Ruta base para manejar otras solicitudes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Ruta para manejar el guardado de datos en Atencion.txt
app.post("/guardar-contacto", (req, res) => {
    const { name, email, details } = req.body;

    // Validar datos en el servidor
    const nameRegex = /^[a-zA-Z\sáéíóúÁÉÍÓÚñÑ]+$/;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!name || !nameRegex.test(name)) {
        return res.status(400).json({ error: "Nombre inválido. Solo se permiten letras y espacios." });
    }

    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ error: "Correo electrónico inválido." });
    }

    if (!details || details.trim() === "") {
        return res.status(400).json({ error: "El mensaje no puede estar vacío." });
    }

    // Formatear los datos para el archivo
    const data = `Nombre: ${name}\nCorreo: ${email}\nMensaje: ${details}\n-----------------------------\n`;

    // Ruta del archivo Atencion.txt
    const filePath = path.join(__dirname, "Atencion.txt");

    // Guardar los datos en el archivo (añadir al final del archivo existente)
    fs.appendFile(filePath, data, (err) => {
        if (err) {
            console.error("Error al guardar los datos en Atencion.txt:", err);
            return res.status(500).send("Error al guardar los datos.");
        }
        console.log("Datos guardados correctamente en Atencion.txt.");
        res.status(200).send("Datos guardados correctamente.");
    });
});


app.get("/obtener-carrito", (req, res) => {
    const filePath = path.join(__dirname, "carrito.txt");
    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            if (err.code === "ENOENT") {
                console.error("Archivo carrito.txt no encontrado.");
                return res.status(404).json({ error: "Archivo carrito.txt no encontrado." });
            }
            console.error("Error al leer el archivo:", err);
            return res.status(500).json({ error: "Error al leer el archivo." });
        }

        // Procesar los datos como JSON
        const items = data
            .split('----------------------------')
            .filter(entry => entry.trim() !== "") // Filtra entradas vacías
            .map(entry => {
                const lines = entry.trim().split('\n');
                const item = {};

                lines.forEach(line => {
                    const [key, value] = line.split(': ');
                    if (key && value) {
                        item[key.trim().toLowerCase()] = value.trim();
                    }
                });

                // Verifica si los datos mínimos existen (por ejemplo, "servicio" y "subservicio")
                if (item["servicio"] && item["subservicio"]) {
                    return item;
                }
                return null; // Si falta información importante, omitir el objeto
            })
            .filter(item => item !== null); // Filtra elementos nulos

        res.json(items);
    });
});



// Ruta para eliminar un servicio del carrito
app.delete("/eliminar-item/:index", (req, res) => {
    const index = parseInt(req.params.index, 10);
    const filePath = path.join(__dirname, "carrito.txt");

    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            console.error("Error al leer el archivo carrito.txt:", err);
            return res.status(500).json({ error: "Error al leer el archivo." });
        }

        const items = data.split('-----------------------------\n').filter(entry => entry.trim() !== "");

        if (index < 0 || index >= items.length) {
            return res.status(400).json({ error: "Índice inválido." });
        }

        items.splice(index, 1);

        const updatedData = items.join('-----------------------------\n') + '\n-----------------------------\n';

        fs.writeFile(filePath, updatedData, (err) => {
            if (err) {
                console.error("Error al escribir en carrito.txt:", err);
                return res.status(500).json({ error: "Error al actualizar el archivo." });
            }

            console.log("Servicio eliminado correctamente del carrito.");
            res.status(200).send("Servicio eliminado correctamente.");
        });
    });
});

// Manejo de otras rutas para servir páginas específicas
app.get("/:page", (req, res) => {
    const page = req.params.page;
    const pagePath = path.join(__dirname, "pages", page);
    if (fs.existsSync(pagePath)) {
        res.sendFile(pagePath);
    } else {
        res.status(404).send("Página no encontrada.");
    }
});

// Función para calcular el precio según el subservicio
function calcularPrecio(subservice) {
    const precios = {
        "Cambio de planta o suela": 25.0,
        "Cambio de tapas": 15.0,
        "Cocidos": 10.0,
        "Cambio de cierre a zapatos": 20.0,
        "Lustrado": 5.0,
        "Pintado de zapatos de tela": 12.0,
        "Pintado de Artículos de Cuero": 10.0,
        "Pintar chompas de cuero": 15.0,
        "Pintar zapatos de cuero": 8.0,
        "Pintado de carteras de cuero": 9.0,
        "Pintado de cinturones de cuero": 5.0,
        "Pintura personalizada": 16.0,
        "Arreglo de cierre de mochilas": 5.0,
        "Arreglo de mochilas rotas": 10.0,
        "Arreglo de riatas": 7.0,
        "Cambio de hebillas y broches": 9.0,
        "Reforzamiento de costuras": 6.0,
        // Añade más precios según tus subservicios
    };
    if (!precios[subservice]) {
        console.warn(`Precio no definido para el subservicio: ${subservice}`);
    }
    return precios[subservice] || 0.0;  
}

// Iniciar el servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor escuchando en http://172.16.0.117:${PORT}`);
});
