import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { adminAllCategories, getPostById } from "@/lib/data";
import { PostEditor } from "../post-editor";

export default async function EditPostPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const [post, categories] = await Promise.all([getPostById(Number(id)), adminAllCategories()]);
  if (!post) notFound();
  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">Edit post</h1>
      <PostEditor post={post} categories={categories} saved={saved === "1"} />
    </>
  );
}
