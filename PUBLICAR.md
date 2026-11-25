# Cómo publicar un cambio

Cloudflare publica **solo** cada vez que algo llega a la rama `main` de GitHub. No hay que
apretar nada en Cloudflare. (La puesta en marcha inicial está en `CLOUDFLARE.md`.)

## Pasos (para Claude)

1. Trabajar en una rama nueva, nunca directo en `main`.
2. Antes de subir, siempre:
   ```bash
   npm install
   npm run check
   ```
   Si algo falla, no se sube: se arregla primero.
3. Si cambiaste pantallas, probalas en la computadora (`npm run local`, y la prueba de
   `pruebas-navegador/prueba.cjs`).
4. Subir la rama y abrir un pull request en GitHub. Cloudflare arma una **versión de prueba** con
   su propia dirección (aparece en el pull request). Ojo: usa la **misma base de datos** que la
   app real, así que no cargues datos inventados ahí.
5. Cuando la persona da el OK, se junta el pull request con `main`. En uno o dos minutos la app
   publicada tiene el cambio. Contale a la persona qué cambió, en dos o tres líneas, sin jerga.

## Si algo sale mal
- En Cloudflare → Workers & Pages → direccion-oficina → **Deployments**, cada publicación queda
  guardada: se puede volver a una anterior con **Rollback**. Los datos no se tocan.
- Si la compilación falla en Cloudflare, el error aparece en esa misma pantalla, y la app sigue
  con la versión anterior.
