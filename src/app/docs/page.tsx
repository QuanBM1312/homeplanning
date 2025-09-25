import ReactSwagger from "@/components/ReactSwagger";
import { swaggerSpec } from "@/lib/swagger";

export default async function ApiDocPage() {
    return (
        <section className="container">
            <ReactSwagger spec={swaggerSpec} />
        </section>
    );
}
