import { parseBody, parseQuery, ok, created } from "@/lib/validators";
import { BrandCreateRequestZ, ListBrandsQueryZ } from "@/lib/geo-zod-requests";
import { BrandResponseZ, BrandsListResponseZ } from "@/lib/geo-zod-full";
import { createBrandService, listBrandsService } from "@/lib/geo-services";
import { validateResponse } from "@/lib/validators";

export async function GET(req: Request) {
    const q = parseQuery(req, ListBrandsQueryZ);
    if (!q.ok) return q.response;

    const result = await listBrandsService(q.data);

    const v = validateResponse(result, BrandsListResponseZ);
    if (!v.ok) return v.response;

    return ok(v.data);
}

export async function POST(req: Request) {
    const b = await parseBody(req, BrandCreateRequestZ);
    if (!b.ok) return b.response;

    const brand = await createBrandService(b.data);

    const v = validateResponse(brand, BrandResponseZ);
    if (!v.ok) return v.response;

    return created(v.data);
}
