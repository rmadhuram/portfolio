import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { PostView } from "@/components/post-view";
import { requireAdmin } from "@/lib/auth";
import { getApprovedComments, getPostById } from "@/lib/data";

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const post = await getPostById(Number((await params).id));
  if (!post) notFound();
  const comments = await getApprovedComments(post.id);
  return (
    <SiteShell>
      <p className="mb-4 rounded bg-amber-100 px-3 py-2 text-xs text-amber-900">Preview · {post.status}</p>
      <PostView post={post} comments={comments} />
    </SiteShell>
  );
}
