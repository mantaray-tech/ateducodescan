// api/enviar-lote.js
//
// Proxy entre la página de captura y el endpoint de Apps Script (GAS).
// En Vercel las funciones van en la carpeta /api y usan el formato (req, res).
//
// Variables de entorno a configurar en Vercel:
//   GAS_URL        → URL de la web app de Apps Script
//   NETLIFY_TOKEN  → misma clave secreta que está en Script Properties → NETLIFY_TOKEN

module.exports = async function handler(req, res) {
  // Cabeceras CORS para que el HTML del mismo sitio pueda llamar a esta función
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  }

  // Variables de entorno
  const gasUrl = process.env.GAS_URL       || '';
  const token  = process.env.NETLIFY_TOKEN || '';

  if (!gasUrl || !token) {
    console.error('Faltan variables de entorno: GAS_URL o NETLIFY_TOKEN');
    return res.status(500).json({
      ok: false,
      error: 'El servidor no está configurado correctamente. Contacta al administrador.'
    });
  }

  // Vercel parsea automáticamente el body JSON si Content-Type es application/json
  const body = req.body || {};

  // Validaciones básicas
  if (!body.centroId)  return res.status(400).json({ ok: false, error: 'Falta centroId.' });
  if (!body.estancia)  return res.status(400).json({ ok: false, error: 'Falta estancia.' });
  if (!Array.isArray(body.codigos) || !body.codigos.length) {
    return res.status(400).json({ ok: false, error: 'No hay códigos en el lote.' });
  }

  // Llamada servidor-a-servidor a GAS (sin restricción CORS)
  try {
    const gasRes = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, token }),
      redirect: 'follow'
    });

    const raw = await gasRes.text();
    let gasData;
    try {
      gasData = JSON.parse(raw);
    } catch (e) {
      throw new Error('Respuesta inesperada de GAS: ' + raw.slice(0, 200));
    }

    return res.status(200).json(gasData);

  } catch (err) {
    console.error('Error llamando a GAS:', err.message);
    return res.status(502).json({
      ok: false,
      error: 'No se pudo contactar con el servidor principal.'
    });
  }
};
