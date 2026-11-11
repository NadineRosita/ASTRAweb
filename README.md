# ASTRAweb

Web de ASTRA (Asociación de Técnicas de estudio y Rendimiento Académico, ETSII, Universidad de Sevilla).
HTML + CSS + JavaScript sin frameworks ni build. **Todo lo que cambia está en `datos.json`**: no hace falta tocar el HTML.

> Edita `datos.json` con cuidado: las comillas y las comas importan. Si dudas, pega el contenido en <https://jsonlint.com> antes de subirlo. Si el archivo tiene un error, la web se ve con los valores por defecto del HTML.

## Cambiar el número de miembros
En `datos.json`, cambia `"miembros": 33` por el nuevo número (entre 1 y 150). Se actualiza solo en el hero, en la sección Únete y en las estrellas de la constelación.

## Calendario de eventos
Los eventos viven en la lista `eventos` de `datos.json`. La web muestra el más cercano como "próxima actividad" y todos en el calendario. Los eventos pasados desaparecen solos.

### Desde el panel (recomendado): `admin.html`
Abre `https://nadinerosita.github.io/ASTRAweb/admin.html` (no está enlazada desde la web ni la indexan los buscadores). Desde ahí puedes **añadir, editar y eliminar** eventos y pulsar **Guardar y publicar**; el cambio aparece en la web en uno o dos minutos.

Para entrar hace falta un **token personal de GitHub**, así solo puede editar quien tenga acceso al repositorio:
1. Añade a la persona como colaboradora (*Settings → Collaborators*).
2. Esa persona crea un token en *Settings → Developer settings → Personal access tokens → Fine-grained tokens*: solo este repositorio y permiso **Contents: Read and write**. Mejor con caducidad corta.
3. Lo pega en `admin.html`. Se guarda solo en su navegador (en memoria de la sesión, o en el dispositivo si marca "Recordarme"). Para dejar de dar acceso basta con quitarla de colaboradores o revocar el token.

Las horas se escriben siempre en horario de Madrid; el panel calcula solo `+01:00` o `+02:00`.

### A mano en `datos.json`
```json
"eventos": [
  {
    "titulo": "Taller de técnicas de estudio",
    "descripcion": "Texto breve.",
    "inicio": "2026-12-03T17:00:00+01:00",
    "fin": "2026-12-03T18:30:00+01:00",
    "lugar": "Aula A2.11, ETSII",
    "abierta": true
  }
]
```
- Las fechas llevan la hora de Madrid: `+01:00` en invierno y `+02:00` en verano.
- `descripcion`, `fin`, `lugar` y `abierta` son opcionales. Sin `fin` se supone 2 horas.
- `"abierta": true` añade "Abierta a todo el mundo, seas o no de ASTRA".
- Opcional: `"titularSeccion": "Hablamos de *exámenes*"` cambia el titular de la sección cuando ese evento es el próximo (lo que va entre `*` queda subrayado en amarillo).
- Si no quedan eventos futuros (`"eventos": []`), la sección muestra "Pronto anunciamos la siguiente actividad" con un botón a Instagram.
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

Para que Google encuentre la web, añade sitemap.xml en Google Search Console (obots.txt solo lo leen los buscadores si está en la raíz del dominio, y GitHub Pages lo sirve dentro de /ASTRAweb/).

Si la dirección final no es `https://nadinerosita.github.io/ASTRAweb/`, actualiza las etiquetas `og:url`, `og:image` y `twitter:image` de `index.html`.

## Estructura
```
index.html   contenido por defecto y estructura
admin.html   panel para gestionar eventos (js/admin.js, css/admin.css)
sitemap.xml, robots.txt   para buscadores
datos.json   datos editables
css/styles.css   estilos
js/main.js   pintado de datos, constelación, animaciones por scroll
assets/img/  logo, mascota y fotos de la bitácora
referencia/  prototipo de diseño (no se enlaza desde la web)
```
