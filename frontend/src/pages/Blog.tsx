import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Calendar, User, ArrowRight, Search, Tag, Clock, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  author_name: string;
  created_at: string;
  published_at: string;
  read_time: number;
  views: number;
  categories: string[];
  tags: string[];
}

interface Category {
  name: string;
  count: number;
}

interface Tag {
  name: string;
  count: number;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Blog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Get query parameters
  const page = parseInt(searchParams.get('page') || '1');
  const category = searchParams.get('category');
  const tag = searchParams.get('tag');
  const query = searchParams.get('q');

  useEffect(() => {
    setCurrentPage(page);
    setActiveCategory(category);
    setActiveTag(tag);
    if (query) {
      setSearchTerm(query);
    }
  }, [page, category, tag, query]);

  useEffect(() => {
    fetchBlogPosts();
    fetchFeaturedPosts();
    fetchCategories();
    fetchTags();
  }, [currentPage, activeCategory, activeTag, searchTerm]);

  const fetchBlogPosts = async () => {
    try {
      setIsLoading(true);
      let url = `${import.meta.env.VITE_API_URL}/blogs?page=${currentPage}&limit=10`;

      if (activeCategory) {
        url = `${import.meta.env.VITE_API_URL}/blogs/category/${activeCategory}?page=${currentPage}&limit=10`;
      } else if (activeTag) {
        url = `${import.meta.env.VITE_API_URL}/blogs/tag/${activeTag}?page=${currentPage}&limit=10`;
      } else if (searchTerm) {
        url = `${import.meta.env.VITE_API_URL}/blogs/search?q=${searchTerm}&page=${currentPage}&limit=10`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch blog posts');
      }

      const data = await response.json();
      setPosts(data.posts);
      setTotalPages(data.pagination.totalPages);
      setTotalPosts(data.pagination.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load blog posts');
      console.error('Error fetching blog posts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFeaturedPosts = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/blogs/featured?limit=3`);
      if (response.ok) {
        const data = await response.json();
        setFeaturedPosts(data);
      }
    } catch (error) {
      console.error('Error fetching featured posts:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/blogs/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/blogs/tags`);
      if (response.ok) {
        const data = await response.json();
        setTags(data);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchParams({ q: searchTerm, page: '1' });
      setCurrentPage(1);
      setActiveCategory(null);
      setActiveTag(null);
    }
  };

  const handlePageChange = (page: number) => {
    const params: Record<string, string> = { page: page.toString() };

    if (activeCategory) {
      params.category = activeCategory;
    } else if (activeTag) {
      params.tag = activeTag;
    } else if (searchTerm) {
      params.q = searchTerm;
    }

    setSearchParams(params);
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const handleCategoryClick = (category: string) => {
    setSearchParams({ category, page: '1' });
    setCurrentPage(1);
    setActiveCategory(category);
    setActiveTag(null);
    setSearchTerm('');
  };

  const handleTagClick = (tag: string) => {
    setSearchParams({ tag, page: '1' });
    setCurrentPage(1);
    setActiveTag(tag);
    setActiveCategory(null);
    setSearchTerm('');
  };

  const clearFilters = () => {
    setSearchParams({ page: '1' });
    setCurrentPage(1);
    setActiveCategory(null);
    setActiveTag(null);
    setSearchTerm('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-center">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Mental Health Blog</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Insights, tips, and stories to support your mental health journey
        </p>
      </div>

      {/* Featured Posts */}
{!activeCategory && !activeTag && !searchTerm && currentPage === 1 && featuredPosts.length > 0 && (
  <div className="mb-16">
    <h2 className="text-2xl font-bold mb-8">Featured Articles</h2>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {featuredPosts.map((post) => (
        <div key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:shadow-lg hover:-translate-y-1">
          <img
            src={post.featured_image || 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b'}
            alt={post.title}
            className="w-full h-48 object-cover"
          />
          <div className="p-6">
            <div className="flex flex-wrap gap-2 mb-3">
              {Array.isArray(post.categories) &&
                post.categories.slice(0, 2).map((category) => (
                  <span
                    key={category}
                    className="bg-rose-50 text-rose-600 px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:bg-rose-100"
                    onClick={() => handleCategoryClick(category)}
                  >
                    {category}
                  </span>
                ))}
            </div>
            <h3 className="text-xl font-bold mb-2 line-clamp-2">{post.title}</h3>
            <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
            <div className="flex justify-between items-center">
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{formatDate(post.published_at)}</span>
              </div>
              <Link
                to={`/blog/${post.slug}`}
                className="text-rose-500 hover:text-rose-600 font-medium flex items-center"
              >
                Read More
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="lg:w-2/3">
          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <form onSubmit={handleSearch} className="flex gap-4 mb-6">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search articles..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <button
                type="submit"
                className="bg-rose-500 text-white px-6 py-2 rounded-lg hover:bg-rose-600"
              >
                Search
              </button>
            </form>

            {/* Active Filters */}
            {(activeCategory || activeTag || searchTerm) && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-gray-500">Active filters:</span>
                {activeCategory && (
                  <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-sm flex items-center">
                    Category: {activeCategory}
                    <button
                      onClick={clearFilters}
                      className="ml-2 hover:text-rose-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {activeTag && (
                  <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-sm flex items-center">
                    Tag: {activeTag}
                    <button
                      onClick={clearFilters}
                      className="ml-2 hover:text-rose-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {searchTerm && (
                  <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-sm flex items-center">
                    Search: {searchTerm}
                    <button
                      onClick={clearFilters}
                      className="ml-2 hover:text-rose-800"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Results Count */}
            <p className="text-sm text-gray-500">
              Showing {posts.length} of {totalPosts} articles
            </p>
          </div>

          {/* Blog Posts */}
          <div className="space-y-8">
            {posts.map((post) => (
              <article
                key={post.id}
                className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:shadow-lg"
              >
                <div className="md:flex">
                  <div className="md:w-1/3">
                    <img
                      src={post.featured_image || 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b'}
                      alt={post.title}
                      className="w-full h-48 md:h-full object-cover"
                    />
                  </div>
                  <div className="p-6 md:w-2/3">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {post.categories.map((category) => (
                        <span
                          key={category}
                          className="bg-rose-50 text-rose-600 px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:bg-rose-100"
                          onClick={() => handleCategoryClick(category)}
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{post.title}</h2>
                    <p className="text-gray-600 mb-4">{post.excerpt}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-gray-600 text-sm cursor-pointer hover:text-rose-500 flex items-center"
                          onClick={() => handleTagClick(tag)}
                        >
                          <Tag className="h-4 w-4 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          <span>{post.author_name}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>{formatDate(post.published_at)}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{post.read_time} min read</span>
                        </div>
                        <div className="flex items-center">
                          <Eye className="h-4 w-4 mr-1" />
                          <span>{post.views} views</span>
                        </div>
                      </div>
                      <Link
                        to={`/blog/${post.slug}`}
                        className="text-rose-500 hover:text-rose-600 font-medium flex items-center"
                      >
                        Read More
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:w-1/3 space-y-8">
          {/* Categories */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Categories</h2>
            <div className="space-y-2">
              {categories.map((category) => (
                <button
                  key={category.name}
                  onClick={() => handleCategoryClick(category.name)}
                  className={`block w-full text-left px-3 py-2 rounded-lg transition-colors ${activeCategory === category.name
                    ? 'bg-rose-50 text-rose-600'
                    : 'hover:bg-gray-50'
                    }`}
                >
                  <span className="flex justify-between items-center">
                    <span>{category.name}</span>
                    <span className="text-sm text-gray-500">{category.count}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Popular Tags */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Popular Tags</h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.name}
                  onClick={() => handleTagClick(tag.name)}
                  className={`px-3 py-1 rounded-full text-sm ${activeTag === tag.name
                    ? 'bg-rose-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {tag.name} ({tag.count})
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const showEllipsis = totalPages > 7;

  const getVisiblePages = () => {
    if (!showEllipsis) return pages;

    if (currentPage <= 3) {
      return [...pages.slice(0, 5), '...', totalPages];
    }

    if (currentPage >= totalPages - 2) {
      return [1, '...', ...pages.slice(totalPages - 5)];
    }

    return [
      1,
      '...',
      ...pages.slice(currentPage - 2, currentPage + 1),
      '...',
      totalPages
    ];
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`p-2 rounded-lg ${currentPage === 1
          ? 'text-gray-400 cursor-not-allowed'
          : 'text-gray-600 hover:bg-gray-100'
          }`}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {getVisiblePages().map((page, index) => (
        <button
          key={index}
          onClick={() => typeof page === 'number' && onPageChange(page)}
          className={`px-4 py-2 rounded-lg ${page === currentPage
            ? 'bg-rose-500 text-white'
            : page === '...'
              ? 'text-gray-400 cursor-default'
              : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`p-2 rounded-lg ${currentPage === totalPages
          ? 'text-gray-400 cursor-not-allowed'
          : 'text-gray-600 hover:bg-gray-100'
          }`}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
};

export default Blog;