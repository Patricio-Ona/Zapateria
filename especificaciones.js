// Obtener parámetros de la URL o del LocalStorage
document.addEventListener("DOMContentLoaded", () => {
    const service = localStorage.getItem("selectedService") || "No especificado";
    const subservice = localStorage.getItem("selectedSubservice") || "No especificado";

    document.getElementById("selected-service").value = service;
    document.getElementById("selected-subservice").value = subservice;

    // Opcional: Borrar datos después de usarlos
    localStorage.removeItem("selectedService");
    localStorage.removeItem("selectedSubservice");
});

// Vista previa de la imagen
document.getElementById('photo').addEventListener('change', function(event) {
    const preview = document.getElementById('photo-preview');
    preview.innerHTML = ''; // Limpia cualquier vista previa anterior
    const file = event.target.files[0];
    if (file) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        preview.appendChild(img);
    }
});

// Validación del formulario y envío de datos al servidor
document.getElementById('specifications-form').addEventListener('submit', function(event) {
    event.preventDefault();

    // Validación del número de teléfono
    const phone = document.getElementById('phone').value;
    if (phone && !/^09\d{8}$/.test(phone)) {
        alert('El número de teléfono debe tener el formato 09XXXXXXXX.');
        return;
    }

    // Recopilar datos del formulario
    const serviceName = document.getElementById('selected-service').value;
    const subservice = document.getElementById('selected-subservice').value;
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const details = document.getElementById('details').value;
    const phoneNumber = document.getElementById('phone').value;

    const formData = {
        serviceName,
        subservice,
        name,
        email,
        details,
        phone: phoneNumber || "No especificado"
    };

    // Enviar datos al servidor
    fetch("http://172.16.0.117:5000/guardar-datos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
    })
        .then((response) => {
            if (response.ok) {
                alert("¡Especificaciones enviadas con éxito!");
                // Redirigir al carrito de compras
                window.location.href = "carrito.html";
            } else {
                alert("Error al guardar los datos.");
            }
        })
        .catch((error) => {
            console.error("Error al enviar los datos al servidor:", error);
        });
});
