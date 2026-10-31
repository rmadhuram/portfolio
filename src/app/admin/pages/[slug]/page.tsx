import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { PageEditor } from "./page-editor";

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const page = slug === "new" ? null : (await db.select().from(schema.pages).where(eq(schema.pages.slug, slug)))[0] ?? null;
  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">{page ? `Edit: ${page.title}` : "New page"}</h1>
      <PageEditor page={page} />
    </>
  );
}
