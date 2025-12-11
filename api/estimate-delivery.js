export default async function handler(req, res) {
  const { orderId } = req.query;

  if (!orderId) {
    return res.status(400).json({ error: "Missing orderId" });
  }

  try {
    // --- 1. Obtener datos de VTEX OMS ---
    const vtexUrl = `https://tommymxqa.vtexcommercestable.com.br/api/oms/pvt/orders/${orderId}`;

    const vtexResponse = await fetch(vtexUrl, {
      method: "GET",
      headers: {
        "X-VTEX-API-AppKey": process.env.VTEX_APP_KEY,
        "X-VTEX-API-AppToken": process.env.VTEX_APP_TOKEN,
        "Content-Type": "application/json"
      }
    });

    if (!vtexResponse.ok) {
      return res.status(500).json({
        error: "VTEX request failed",
        status: vtexResponse.status
      });
    }

    const data = await vtexResponse.json();

    // --- 2. Intento 1: buscar shippingEstimateDate ---
    let estimateDate =
      data.shippingData?.logisticsInfo?.[0]?.shippingEstimateDate || null;

    // --- 3. Intento 2: interpretar shippingEstimate (ej: 5bd, 3d) ---
    if (!estimateDate) {
      const estimateRaw =
        data.shippingData?.logisticsInfo?.[0]?.shippingEstimate || null;

      if (estimateRaw) {
        const days = parseInt(estimateRaw.replace(/\D/g, ""), 10);
        const isBusiness = estimateRaw.includes("bd");

        estimateDate = calculateDate(days, isBusiness);
      }
    }

    return res.status(200).json({
      orderId,
      estimateDeliveryDate: estimateDate,
      method: estimateDate ? "calculated" : "none",
      raw: data
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal error",
      message: error.message
    });
  }
}

// --- Suma días hábiles o naturales ---
function calculateDate(days, isBusiness) {
  let date = new Date();

  if (!isBusiness) {
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  }

  // business days
  let addedDays = 0;
  while (addedDays < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay(); // 0=Domingo, 6=Sábado
    if (day !== 0 && day !== 6) {
      addedDays++;
    }
  }

  return date.toISOString().split("T")[0];
}
