import { parseParams, parseBody, ok, notFound } from "@/lib/validators";
import { BrandUpdateRequestZ } from "@/lib/geo-zod-requests";
import { BrandResponseZ } from "@/lib/geo-zod-full";
import { getBrandService, updateBrandService } from "@/lib/geo-services";
import { validateResponse } from "@/lib/validators";
import { z } from "zod";

const ParamsZ = z.object({ brand_id: z.string() });

export async function GET(
    req: Request,
    { params }: { params: Promise<{ brand_id: string }> }
) {
    const resolvedParams = await params;
    const p = parseParams(resolvedParams, ParamsZ);
    if (!p.ok) return p.response;

    const brand = await getBrandService(p.data.brand_id);
    if (!brand) return notFound(`Brand not found: ${p.data.brand_id}`);

    const v = validateResponse(brand, BrandResponseZ);
    if (!v.ok) return v.response;

    return ok(v.data);
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ brand_id: string }> }
) {
    const resolvedParams = await params;
    const p = parseParams(resolvedParams, ParamsZ);
    if (!p.ok) return p.response;

    const b = await parseBody(req, BrandUpdateRequestZ);
    if (!b.ok) return b.response;

    const updated = await updateBrandService(p.data.brand_id, b.data);
    if (!updated) return notFound(`Brand not found: ${p.data.brand_id}`);

    const v = validateResponse(updated, BrandResponseZ);
    if (!v.ok) return v.response;

    return ok(v.data);
}
