import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Flag, Shield } from 'lucide-react';

interface Post {
  id: number;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  tags: string[];
  isLiked: boolean;
}

const initialPosts: Post[] = [
  {
    id: 1,
    content: "Sometimes I feel overwhelmed by everything happening in my life. It's comforting to know I'm not alone in feeling this way.",
    timestamp: "10 minutes ago",
    likes: 24,
    comments: 5,
    tags: ["Anxiety", "Support"],
    isLiked: false
  },
  {
    id: 2,
    content: "Today was a better day. I practiced the breathing exercises I learned here, and they really helped with my anxiety.",
    timestamp: "1 hour ago",
    likes: 42,
    comments: 8,
    tags: ["Progress", "Mindfulness"],
    isLiked: false
  }
];

const SafeSpace = () => {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [newPost, setNewPost] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const availableTags = [
    "Anxiety", "Depression", "Support", "Progress",
    "Mindfulness", "Self-care", "Gratitude", "Stress"
  ];

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    const post: Post = {
      id: posts.length + 1,
      content: newPost,
      timestamp: "Just now",
      likes: 0,
      comments: 0,
      tags: selectedTags,
      isLiked: false
    };

    setPosts([post, ...posts]);
    setNewPost('');
    setSelectedTags([]);
  };

  const toggleLike = (postId: number) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          likes: post.isLiked ? post.likes - 1 : post.likes + 1,
          isLiked: !post.isLiked
        };
      }
      return post;
    }));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-4">SafeSpace</h1>
        <p className="text-gray-600">A supportive community where you can share your thoughts anonymously and connect with others</p>
      </div>

      {/* Guidelines Banner */}
      <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 mb-8">
        <div className="flex items-center">
          <Shield className="h-5 w-5 text-rose-500 mr-2" />
          <h2 className="font-semibold text-rose-700">Community Guidelines</h2>
        </div>
        <ul className="mt-2 text-sm text-rose-600 space-y-1">
          <li>• Be kind and supportive to others</li>
          <li>• Maintain anonymity - don't share personal information</li>
          <li>• Report any concerning content</li>
          <li>• Seek professional help for serious issues</li>
        </ul>
      </div>

      {/* Create Post */}
      <form onSubmit={handlePostSubmit} className="bg-white rounded-lg shadow-md p-6 mb-8">
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="Share your thoughts anonymously..."
          className="w-full p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 min-h-[120px]"
        />
        
        <div className="mt-4 mb-4">
          <p className="text-sm text-gray-600 mb-2">Add tags:</p>
          <div className="flex flex-wrap gap-2">
            {availableTags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedTags.includes(tag)
                    ? 'bg-rose-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-rose-500 text-white px-6 py-2 rounded-lg hover:bg-rose-600 transition-colors"
          >
            Share Anonymously
          </button>
        </div>
      </form>

      {/* Posts */}
      <div className="space-y-6">
        {posts.map(post => (
          <div key={post.id} className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-800 mb-4">{post.content}</p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map(tag => (
                <span
                  key={tag}
                  className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-6">
                <button
                  onClick={() => toggleLike(post.id)}
                  className={`flex items-center space-x-1 ${
                    post.isLiked ? 'text-rose-500' : 'hover:text-rose-500'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${post.isLiked ? 'fill-current' : ''}`} />
                  <span>{post.likes}</span>
                </button>
                <button className="flex items-center space-x-1 hover:text-rose-500">
                  <MessageCircle className="h-5 w-5" />
                  <span>{post.comments}</span>
                </button>
                <button className="flex items-center space-x-1 hover:text-rose-500">
                  <Share2 className="h-5 w-5" />
                </button>
                <button className="flex items-center space-x-1 hover:text-rose-500">
                  <Flag className="h-5 w-5" />
                  <span>Report</span>
                </button>
              </div>
              <span>{post.timestamp}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SafeSpace;