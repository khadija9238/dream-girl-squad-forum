declare const process: {
  env: {
    REACT_APP_SUPABASE_URL: string;
    REACT_APP_SUPABASE_ANON_KEY: string;
  };
};
import { useState, useEffect } from "react";
import "./styles.css";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_ANON_KEY!
);

type Comment = {
  id: number;
  text: string;
};

type Post = {
  id: string;
  title: string;
  content: string;
  image: string;
  createdAt: string;
  upvotes: number;
  comments: Comment[];
};

export default function App() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    async function loadPosts() {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        alert("Supabase error: " + error.message);
        return;
      }

      setPosts(
        (data || []).map((post) => ({
          id: post.id,
          title: post.title,
          content: post.content || "",
          image: post.image_url || "",
          createdAt: post.created_at,
          upvotes: post.upvotes || 0,
          comments: [],
        }))
      );
    }

    loadPosts();
  }, []);

  const [page, setPage] = useState("home");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [comment, setComment] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");

  const selectedPost = posts.find((p) => p.id === selectedId);

  function openForm(post?: Post) {
    setEditingId(post ? post.id : null);
    setTitle(post?.title || "");
    setContent(post?.content || "");
    setImage(post?.image || "");
    setPage("form");
  }

  async function savePost(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return;
    if (editingId === null) {
      const { error } = await supabase.from("posts").insert({
        title: title,
        content: content,
      });

      if (error) {
        alert("Supabase error: " + error.message);
        return;
      }
    }

    if (editingId !== null) {
      setPosts((old) =>
        old.map((p) =>
          p.id === editingId ? { ...p, title, content, image } : p
        )
      );
      setSelectedId(editingId);
      setPage("detail");
    } else {
      const newPost: Post = {
        id: crypto.randomUUID(),
        title,
        content,
        image,
        createdAt: new Date().toLocaleString(),
        upvotes: 0,
        comments: [],
      };
      setPosts((old) => [newPost, ...old]);
      setPage("home");
    }
  }

  async function upvote(id: string) {
    const post = posts.find((p) => p.id === id);
    if (!post) return;

    const newUpvotes = post.upvotes + 1;

    const { data, error } = await supabase
      .from("posts")
      .update({ upvotes: newUpvotes })
      .eq("id", id)
      .select();

    if (!error && data?.length === 0) {
      alert("Supabase did not update the post. Check RLS policies.");
      return;
    }

    if (error) {
      alert("Supabase error: " + error.message);
      return;
    }

    setPosts((old) =>
      old.map((p) => (p.id === id ? { ...p, upvotes: newUpvotes } : p))
    );
  }

  async function deletePost(id: string) {
    if (!window.confirm("Delete this post?")) return;

    const { error } = await supabase.from("posts").delete().eq("id", id);

    if (error) {
      alert("Supabase error: " + error.message);
      return;
    }

    setPosts((old) => old.filter((p) => p.id !== id));
    setPage("home");
  }

  function addComment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!comment.trim() || selectedId === null) return;

    setPosts((old) =>
      old.map((p) =>
        p.id === selectedId
          ? {
              ...p,
              comments: [...p.comments, { id: Date.now(), text: comment }],
            }
          : p
      )
    );
    setComment("");
  }

  const visiblePosts = posts
    .filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sort === "popular"
        ? b.upvotes - a.upvotes
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return (
    <div className="community">
      <header>
        <h1>💗 Dream Girl Squad</h1>
        <p>Your safe space to connect, share & glow ✨</p>
        <nav>
          <button onClick={() => setPage("home")}>Home</button>
          <button onClick={() => openForm()}>+ Create Post</button>
        </nav>
      </header>

      <main>
        {page === "home" && (
          <>
            <h2>Community Feed 🌸</h2>

            <input
              placeholder="Search posts by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest</option>
              <option value="popular">Most Upvoted</option>
            </select>

            {visiblePosts.length === 0 && (
              <p>No posts yet. Be the first to share! 💕</p>
            )}

            {visiblePosts.map((post) => (
              <article
                key={post.id}
                onClick={() => {
                  setSelectedId(post.id);
                  setPage("detail");
                }}
              >
                <small>{post.createdAt}</small>
                <h3>{post.title}</h3>
                <p>💗 {post.upvotes} upvotes</p>
              </article>
            ))}
          </>
        )}

        {page === "form" && (
          <section>
            <h2>{editingId ? "Edit Post" : "Create a Post"} 💕</h2>
            <form onSubmit={savePost}>
              <input
                required
                placeholder="Post title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                placeholder="Share your thoughts..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <input
                placeholder="Image URL (optional)"
                value={image}
                onChange={(e) => setImage(e.target.value)}
              />
              <button type="submit">
                {editingId ? "Save Changes" : "Publish Post"}
              </button>
            </form>
          </section>
        )}

        {page === "detail" && selectedPost && (
          <section>
            <button onClick={() => setPage("home")}>← Back to Feed</button>
            <h2>{selectedPost.title}</h2>
            <small>{selectedPost.createdAt}</small>
            <p>{selectedPost.content}</p>

            {selectedPost.image && (
              <img
                src={selectedPost.image}
                alt={selectedPost.title}
                style={{ maxWidth: "100%", borderRadius: 12 }}
              />
            )}

            <p>💗 {selectedPost.upvotes} upvotes</p>
            <button onClick={() => upvote(selectedPost.id)}>💗 Upvote</button>
            <button onClick={() => openForm(selectedPost)}>✏️ Edit</button>
            <button onClick={() => deletePost(selectedPost.id)}>
              🗑️ Delete
            </button>

            <h3>Comments 💬</h3>
            {selectedPost.comments.map((c) => (
              <p key={c.id}>💬 {c.text}</p>
            ))}

            <form onSubmit={addComment}>
              <input
                placeholder="Write a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button type="submit">Add Comment</button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
