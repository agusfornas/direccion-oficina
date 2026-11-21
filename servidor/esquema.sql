-- Base de datos de Dirección Oficina (Cloudflare D1).
-- El servidor crea estas tablas solo la primera vez que arranca: no hace falta correr esto a mano.
--
-- Cada registro (una partida, un viaje, una versión de configuración) es un documento JSON
-- con LA MISMA FORMA que tenía en la app vieja de claude.ai. Así la mudanza es copiar tal cual.

CREATE TABLE IF NOT EXISTS documentos (
  coleccion TEXT NOT NULL,          -- partidas, config, tviajes, tconfig
  id        TEXT NOT NULL,          -- p12, v3…
  datos     TEXT NOT NULL,          -- el documento, en JSON
  rev       INTEGER NOT NULL DEFAULT 0,  -- sube 1 en cada cambio (para no pisar cambios ajenos)
  PRIMARY KEY (coleccion, id)
);

-- Último número usado por colección (partida 0001, 0002…).
CREATE TABLE IF NOT EXISTS contadores (
  coleccion TEXT PRIMARY KEY,
  ultimo    INTEGER NOT NULL
);
