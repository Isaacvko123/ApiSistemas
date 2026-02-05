Fuente única de contenido para la documentación.

- Edita los HTML dentro de docs/content (no docs/site).
- Rebuild: node scripts/build-docs.js

Flujo recomendado:
1) Actualiza docs/content/modules.json (operación por módulo) o otros HTML en docs/content/.
2) Cambia el código.
3) Ejecuta el build para sincronizar docs/site.

OpenAPI automático:
- Ejecuta: npm run docs:generate
- Se genera en docs/openapi.json y se consume en /docs/referencia
