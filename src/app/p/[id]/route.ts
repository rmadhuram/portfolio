import { permanentRedirect, notFound } from "next/navigation";
import { getPostByWpId } from "@/lib/data";

// Legacy WordPress ?p=<id> links (redirected here by next.config).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const post = Number.isInteger(id) ? await getPostByWpId(id) : null;
  if (!post) notFound();
  permanentRedirect(`/${post.slug}`);
}
