// /api/nest-submit.js

const BASEROW_TABLE_ID = 749257;
const BASEROW_API_BASE = "https://api.baserow.io/api";

const STATUS_IDS = {
  maintained: 4554142,
  old: 4554143,
  broken: 4554144,
  maybe: 4554144   // alias if frontend uses "maybe"
};

const LADDER_IDS = {
  y: 4571231,
  n: 4571232,
  maybe: 4571233
};

const SIDE_IDS = {
  right: 4571236,
  left: 4571237,
  middle: 4571238,
  roof: 4571239
};

const ASPECT_IDS = {
  N: 4571244,
  NE: 4571245,
  E: 4571246,
  SE: 4571247,
  S: 4571248,
  SW: 4571249,
  W: 4571250,
  NW: 4571251
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
    river,
    nest_name,
    nest_id,
    status,
    latitude,
    longitude,
    territory,
    remark,
    ladder,
    height_m,
    side_going_downriver,
    aspect,
    images
  } = req.body || {};

  if (!nest_name || typeof nest_name !== "string") {
    return res.status(400).json({ error: "nest_name is required" });
  }
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return res.status(400).json({ error: "latitude and longitude must be numbers" });
  }

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
      headers: { Authorization: "Token " + BASEROW_TOKEN },
      body: formData
    });

    const data = await resp.json();
    return data;
  }

  try {
    if (Array.isArray(images)) {
      if (images[0]) img1Obj = await uploadImageToBaserow(images[0]);
      if (images[1]) img2Obj = await uploadImageToBaserow(images[1]);
    }

    const payload = {
      field_6319309: nest_name,
      field_6319310: nest_id || "",
      field_6319311: STATUS_IDS[status] || null,
      field_6319313: latValue,
      field_6319314: lonValue,
      field_6319315: territory || "",
      field_6320040: river || "",
      field_6335875: remark || "",
      field_6335877: LADDER_IDS[ladder] || null,
      field_6335879: height_m || null,
      field_6335880: SIDE_IDS[side_going_downriver] || null,
      field_6335896: ASPECT_IDS[aspect] || null,
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

    const data = await r.json();
    return res.status(200).json({ success: true, id: data.id });

  } catch (err) {
    console.error("Nest submit error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
