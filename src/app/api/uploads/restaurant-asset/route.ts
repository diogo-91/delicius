import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const maxFileSizeInBytes = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const restaurantId = String(formData.get("restaurantId") ?? "restaurant");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo nao enviado." }, { status: 400 });
  }
  if (!allowedTypes.has(file.type)) {
    return NextResponse.json({ error: "Formato de imagem nao permitido." }, { status: 400 });
  }
  if (file.size > maxFileSizeInBytes) {
    return NextResponse.json({ error: "A imagem deve ter no maximo 5 MB." }, { status: 400 });
  }

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const safeRestaurantId = restaurantId.replace(/[^a-zA-Z0-9_-]/g, "") || "restaurant";
  const fileName = `${safeRestaurantId}-hero-${Date.now()}-${randomUUID()}.${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "restaurants");
  const filePath = path.join(uploadDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, buffer);

  return NextResponse.json({ url: `/uploads/restaurants/${fileName}?v=${Date.now()}` });
}
