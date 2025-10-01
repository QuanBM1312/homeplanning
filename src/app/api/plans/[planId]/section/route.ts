import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import logger from "@/lib/logger";
import { z } from "zod";
import { 
    updateFamilySupport, updateFamilySupportSchema,
    updateSpending, updateSpendingSchema,
    updateAssumptions, updateAssumptionsSchema, // Thêm Assumptions
    invalidateReportCache
} from "@/lib/services/planService";

// Schema để validate phần thân của request
const bodySchema = z.object({
    section: z.enum(["familysupport", "spending", "assumptions"]), // Thêm các section khác vào đây
    data: z.any(),
});

/**
 * @swagger
 * /plans/{planId}/section:
 *   patch:
 *     summary: Update a specific section of a plan
 *     description: A unified endpoint to update different sections of a financial plan like family support, spending, etc.
 *     tags: [Plans]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [section, data]
 *             properties:
 *               section:
 *                 type: string
 *                 enum: [familySupport, spending]
 *                 description: The name of the section to update.
 *               data:
 *                 type: object
 *                 description: "The payload containing the fields to update. The structure depends on the 'section' value."
 *             example:
 *               section: "familySupport"
 *               data: { "hasFamilySupport": true, "familySupportAmount": 1000 }
 *     responses:
 *       '200': { description: "Section updated successfully." }
 *       '400': { description: "Bad Request - Invalid input data or unknown section." }
 *       # ... other responses
 */
export async function PATCH(req: NextRequest, { params }: { params: { planId: string } }) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { planId } = params;
        const body = await bodySchema.parse(await req.json());
        
        let result;

        switch (body.section) {
            case "familysupport": {
                const validatedData = updateFamilySupportSchema.parse(body.data);
                result = await updateFamilySupport(planId, userId, validatedData);
                await invalidateReportCache(planId); // Dữ liệu này ảnh hưởng đến tính toán
                break;
            }
            case "spending": {
                const validatedData = updateSpendingSchema.parse(body.data);
                result = await updateSpending(planId, userId, validatedData);
                await invalidateReportCache(planId); // Dữ liệu này cũng ảnh hưởng
                break;
            }
            case "assumptions": {
                const validatedData = updateAssumptionsSchema.parse(body.data);
                result = await updateAssumptions(planId, userId, validatedData);
                await invalidateReportCache(planId); // Dữ liệu này cũng ảnh hưởng
                break;
            }
            default:
                throw new Error(`Unknown section: ${body.section}`);
        }

        logger.info(`Updated section '${body.section}' for plan`, { planId, userId });
        return NextResponse.json(result);

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid data", details: error.format() }, { status: 400 });
        }
        if (error instanceof Error) {
            if (error.message.includes("Plan not found")) {
                return NextResponse.json({ error: error.message }, { status: 404 });
            }
             if (error.message.includes("Unknown section")) {
                return NextResponse.json({ error: error.message }, { status: 400 });
            }
        }
        logger.error(`[API_SECTION_PATCH]`, { error: String(error) });
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
