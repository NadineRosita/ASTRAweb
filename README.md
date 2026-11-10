# ASTRAweb

Web de ASTRA (Asociación de Técnicas de estudio y Rendimiento Académico, ETSII, Universidad de Sevilla).
HTML + CSS + JavaScript sin frameworks ni build. **Todo lo que cambia está en `datos.json`**: no hace falta tocar el HTML.

> Edita `datos.json` con cuidado: las comillas y las comas importan. Si dudas, pega el contenido en <https://jsonlint.com> antes de subirlo. Si el archivo tiene un error, la web se ve con los valores por defecto del HTML.

## Cambiar el número de miembros
En `datos.json`, cambia `"miembros": 33` por el nuevo número (entre 1 y 150). Se actualiza solo en el hero, en la sección Únete y en las estrellas de la constelación.

## Anunciar la próxima actividad
Edita el bloque `proximaActividad`:

```json
"proximaActividad": {
  "titulo": "Taller de técnicas de estudio",
  "descripcion": "Texto breve.",
  "inicio": "2026-12-03T17:00:00+01:00",
  "fin": "2026-12-03T18:30:00+01:00",
  "lugar": "Aula A2.11, ETSII",
  "abierta": true
}
```

- Las fechas llevan la hora de Madrid: `+01:00` en invierno y `+02:00` en verano.
- Se calculan solos el día, el mes, la hora, la cuenta atrás y el enlace a Google Calendar.
- `"abierta": true` añade "Abierta a todo el mundo, seas o no de ASTRA".
- Opcional: `"titularSeccion": "Hablamos de *exámenes*"` cambia el titular de la sección (lo que va entre `*` queda subrayado en amarillo). Si no lo pones y el título no es el de la asamblea, el titular será "Nuestra próxima actividad".
- Cuando `fin` pasa, o si pones `"proximaActividad": null`, la sección muestra "Pronto anunciamos la siguiente actividad" con un botón a Instagram.

## Añadir fotos a la bitácora
1. Sube la foto a `assets/img/fotos/` (mejor en horizontal, formato 4:3 y menos de 300 KB).
2. Añade un elemento a la lista `bitacora`:

```json
"bitacora": [
  { "titulo": "Asamblea de inicio", "fecha": "2026-11", "foto": "assets/img/fotos/asamblea.jpg", "alt": "Estudiantes en el aula durante la asamblea" }
]
```

El `alt` describe la foto para quien no puede verla. Mientras la lista esté vacía (`[]`) se muestra "Estamos llenando la bitácora."

## Activar la app de apuntes
Cuando la app esté lista, en el bloque `apuntes` pon `"disponible": true` y la dirección en `"url"`. Desaparece el sello "Próximamente" y el botón principal pasa a ser "Explorar apuntes".

## Otros datos
`contacto` (correo e Instagram), `formularioInscripcion` y `mentorias` (enlaces de los botones) también se cambian en `datos.json`.

## Probar en local
```
python -m http.server
```
y abre <http://localhost:8000>. (`fetch` no funciona abriendo el archivo con doble clic; en ese caso se ven los valores por defecto del HTML.)

## Publicar en GitHub Pages
1. Sube los cambios a la rama principal (`main`).
2. En GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Rama `main`, carpeta `/ (root)`, y **Save**.
4. En un par de minutos la web aparece en la dirección que indica Pages. El archivo `.nojekyll` evita que GitHub procese los archivos con Jekyll.

Si la dirección final no es `https://nadinerosita.github.io/ASTRAweb/`, actualiza las etiquetas `og:url`, `og:image` y `twitter:image` de `index.html`.

## Estructura
```
index.html   contenido por defecto y estructura
datos.json   datos editables
css/styles.css   estilos
js/main.js   pintado de datos, constelación, animaciones por scroll
assets/img/  logo, mascota y fotos de la bitácora
referencia/  prototipo de diseño (no se enlaza desde la web)
```
