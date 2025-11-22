// /api/nest-submit.js

const BASEROW_TABLE_ID = 749257;
const BASEROW_API_BASE = "https://api.baserow.io/api";

const ACTION_IDS = {
  maintained: 4554142,
  old: 4554143,
  maybe: 4554144
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
  if (!BASEROW_TOKEN) {
    return res.status(500).json({ error: "Missing BASEROW_TOKEN" });
  }

  const {
    nest_name,
    nest_id,
    action,
    latitude,
    longitude,
    territory,
    images
  } = req.body || {};

  if (!nest_name || typeof nest_name !== "string") {
    return res.status(400).json({ error: "nest_name is required" });
  }
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return res.status(400).json({ error: "latitude and longitude must be numbers" });
  }

  // Round to 10 decimal places to match Baserow field limits
  const latValue = Number(latitude.toFixed(10));
  const lonValue = Number(longitude.toFixed(10));

  let img1Obj = null;
  let img2Obj = null;

  async function uploadImageToBaserow(img) {
    if (!img || !img.dataBase64) return null;

    const { filename, mimeType, dataBase64 } = img;
    const buffer = Buffer.from(dataBase64, "base64");

    const formData = new FormData();
    const blob = new Blob([buffer], { type: mimeType || "image/jpeg" });
    formData.append("file", blob, filename || "photo.jpg");

    const resp = await fetch(`${BASEROW_API_BASE}/user-files/upload-file/`, {
      method: "POST",
      headers: {
        Authorization: "Token " + BASEROW_TOKEN
      },
      body: formData
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("Baserow file upload error:", resp.status, text);
      throw new Error("Failed to upload image");
    }

    const data = await resp.json();
    // Baserow expects the full object in the file field array
    return data;
  }

  try {
    if (Array.isArray(images) && images.length > 0) {
      if (images[0]) {
        img1Obj = await uploadImageToBaserow(images[0]);
      }
      if (images[1]) {
        img2Obj = await uploadImageToBaserow(images[1]);
      }
    }

    const payload = {
      field_6319309: nest_name,
      field_6319310: nest_id || "",
      field_6319311: ACTION_IDS[action] || null,
      // field_6319312 is "created on" (read-only) -> do NOT send
      field_6319313: latValue,
      field_6319314: lonValue,
      field_6319315: territory || "",
      field_6319471: img1Obj ? [img1Obj] : [],
      field_6319472: img2Obj ? [img2Obj] : []
    };

    const r = await fetch(
      `${BASEROW_API_BASE}/database/rows/table/${BASEROW_TABLE_ID}/`,
      {
        method: "POST",
        headers: {
          Authorization: "Token " + BASEROW_TOKEN,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      console.error("Baserow row create error:", r.status, text);
      return res.status(r.status).json({ error: text || "Baserow error" });
    }

    const data = await r.json();
    return res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    console.error("Nest submit error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
