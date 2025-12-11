export default async function handler(req, res) {
  const { orderId } = req.query;

  if (!orderId) {
    return res.status(400).json({
      error: "Falta el parámetro orderId"
    });
  }

  try {
    // 🔐 Tus credenciales de QA (cámbialas por variables de entorno luego)
    const APP_KEY = process.env.VTEX_APP_KEY;
    const APP_TOKEN = process.env.VTEX_APP_TOKEN;

    // URL del OMS QA
    const url = `https://tommymxqa.vtexcommercestable.com.br/api/oms/pvt/orders/${orderId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-VTEX-API-AppKey": APP_KEY,
        "X-VTEX-API-AppToken": APP_TOKEN,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `VTEX respondió con ${response.status}`
      });
    }

    const data = await response.json();

    // 📦 Extraemos la fecha estimada si existe
    let estimate = null;

    const logisticsInfo = data?.shippingData?.logisticsInfo?.[0];
    if (logisticsInfo?.shippingEstimateDate) {
      estimate = logisticsInfo.shippingEstimateDate;
    }

    return res.status(200).json({
      orderId,
      status: data.status,
      estimateDeliveryDate: estimate,
      raw: data
    });

  } catch (err) {
    return res.status(500).json({
      error: "Error interno",
      detail: err.message
    });
  }
}
