import { requireAdmin } from "@/lib/auth";
import { adminAllCategories } from "@/lib/data";
import { PostEditor } from "../post-editor";

export default async function NewPostPage() {
  await requireAdmin();
  const categories = await adminAllCategories();
  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">New post</h1>
      <PostEditor post={null} categories={categories} />
    </>
  );
}
