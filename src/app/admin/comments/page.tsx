import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { adminListComments } from "@/lib/data";
import { deleteComment, setCommentStatus } from "@/lib/actions";
import { formatDate } from "@/lib/site";

export default async function CommentsAdmin() {
  await requireAdmin();
  const rows = await adminListComments();
  return (
    <>
      <h1 className="text-xl font-semibold">Comments <span className="text-sm font-normal text-muted">({rows.length})</span></h1>
      <p className="mt-1 text-xs text-muted">Imported from WordPress. New comments are not accepted on the site.</p>
      <ul className="mt-4 divide-y divide-border text-sm">
        {rows.map(({ comment: c, postTitle, postSlug }) => (
          <li key={c.id} className="flex gap-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted">
                <span className="font-medium text-foreground">{c.authorName}</span> on <Link href={`/${postSlug}`} className="hover:text-foreground">{postTitle}</Link> · {formatDate(c.createdAt)} ·{" "}
                <span className={c.status === "approved" ? "text-accent" : "text-amber-600"}>{c.status}</span>
              </div>
              <div className="mt-1 line-clamp-3 text-muted" dangerouslySetInnerHTML={{ __html: c.content }} />
            </div>
            <div className="flex shrink-0 flex-col gap-1 text-xs">
              {c.status !== "approved" && <form action={setCommentStatus}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value="approved" /><button className="text-accent hover:underline">Approve</button></form>}
              {c.status !== "spam" && <form action={setCommentStatus}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value="spam" /><button className="text-muted hover:underline">Hide</button></form>}
              <form action={deleteComment}><input type="hidden" name="id" value={c.id} /><button className="text-red-600 hover:underline">Delete</button></form>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
