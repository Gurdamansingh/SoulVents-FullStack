import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, User, Tag, Clock, Eye, ArrowLeft, Share2, Heart } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  featured_image: string;
  author_name: string;
  published_at: string;
  read_time: number;
  views: number;
  categories: string[];
  tags: string[];
}

const BlogDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    const fetchBlogPost = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${import.meta.env.VITE_API_URL}/blogs/${slug}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch blog post');
        }

        const data = await response.json();
        setPost(data);
      } catch (err: any) {
        console.error('Error fetching blog post:', err);
        setError(err.message || 'Failed to load blog post');
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchBlogPost();
    }
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">
            {error || 'Blog post not found'}
          </div>
          <Link
            to="/blog"
            className="mt-4 inline-flex items-center text-rose-500 hover:text-rose-600"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <Link
          to="/blog"
          className="inline-flex items-center text-rose-500 hover:text-rose-600 mb-8"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Blog
        </Link>

        {/* Featured Image */}
        <img
          src={post.featured_image}
          alt={post.title}
          className="w-full h-[400px] object-cover rounded-xl mb-8"
        />

        {/* Article Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-1" />
              {post.author_name}
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {new Date(post.published_at).toLocaleDateString()}
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {post.read_time} min read
            </div>
            <div className="flex items-center">
              <Eye className="h-4 w-4 mr-1" />
              {post.views} views
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 mt-4">
            {post.categories.map((category) => (
              <Link
                key={category}
                to={`/blog?category=${category}`}
                className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-sm hover:bg-rose-100"
              >
                {category}
              </Link>
            ))}
          </div>
        </div>

        {/* Article Content */}
        <div className="prose max-w-none mb-8">
          {post.content.split('\n').map((paragraph, index) => (
            <p key={index} className="mb-4 text-gray-700 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Tags */}
        <div className="border-t border-gray-200 pt-6 mb-8">
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Link
                key={tag}
                to={`/blog?tag=${tag}`}
                className="flex items-center text-gray-600 hover:text-rose-500"
              >
                <Tag className="h-4 w-4 mr-1" />
                {tag}
              </Link>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center border-t border-gray-200 pt-6">
          <button
            onClick={() => setIsLiked(!isLiked)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              isLiked
                ? 'bg-rose-50 text-rose-600'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
            {isLiked ? 'Liked' : 'Like'}
          </button>

          <button
            onClick={() => {
              navigator.share({
                title: post.title,
                text: post.excerpt,
                url: window.location.href
              }).catch(console.error);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <Share2 className="h-5 w-5" />
            Share
          </button>
        </div>
      </article>
    </div>
  );
};

export default BlogDetail;